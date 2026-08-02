import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import {
  BarChartComponent,
  BarDatum,
  BarSeries,
} from 'src/app/shared/charts/bar-chart.component';
import {
  formatTickDate,
  parseLocalDate,
} from 'src/app/shared/charts/chart-axis';
import { CsvExport, downloadCsv } from 'src/app/shared/charts/chart-export';
import { ChartFrameComponent } from 'src/app/shared/charts/chart-frame.component';
import {
  FilamentSvgDefsComponent,
  FilamentSwatchInput,
} from 'src/app/shared/charts/filament-svg-defs.component';
import { StatTileComponent } from 'src/app/shared/charts/stat-tile.component';
import { FilamentColorSwatchStylePipe } from 'src/app/shared/pipes/filament-color-swatch-style.pipe';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import {
  MaterialGroup,
  MaterialsResponse,
} from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { CsvSection, buildTabCsv, sectionOf } from '../tab-csv';
import { createTabData } from '../tab-data';

/** Below this many days of stock left, a spool is worth flagging before a long print. */
const RUNNING_LOW_DAYS = 30;

@Component({
  selector: 'app-materials-tab',
  imports: [
    MatButtonModule,
    BarChartComponent,
    ChartFrameComponent,
    CurrencyPipe,
    DecimalPipe,
    FilamentColorSwatchStylePipe,
    FilamentSvgDefsComponent,
    StatTileComponent,
  ],
  templateUrl: './materials-tab.component.html',
  styleUrls: ['./materials-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialsTabComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly router = inject(Router);

  private readonly tab = createTabData<MaterialsResponse>(
    this.store.filter,
    (filter) => this.analytics.getMaterials(filter),
    (response) => response.byType.length === 0
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  private readonly typeDefs = viewChild<FilamentSvgDefsComponent>('typeDefs');
  private readonly brandDefs = viewChild<FilamentSvgDefsComponent>('brandDefs');
  private readonly colorDefs = viewChild<FilamentSvgDefsComponent>('colorDefs');

  readonly singleSeries: readonly BarSeries[] = [
    { key: 'value', label: 'Filament used', seriesIndex: 1 },
  ];

  readonly typeSwatches = computed(() =>
    this.swatchesFor(this.data()?.byType ?? [])
  );
  readonly brandSwatches = computed(() =>
    this.swatchesFor(this.data()?.byBrand ?? [])
  );
  readonly colorSwatches = computed(() =>
    this.swatchesFor(this.data()?.byColor ?? [])
  );

  readonly byTypeData = computed(() =>
    this.groupData(this.data()?.byType ?? [], this.typeDefs())
  );
  readonly byBrandData = computed(() =>
    this.groupData(this.data()?.byBrand ?? [], this.brandDefs())
  );
  readonly byColorData = computed(() =>
    this.groupData(this.data()?.byColor ?? [], this.colorDefs())
  );

  /** One series per material type, from the categorical palette — NOT swatch-filled. */
  readonly consumptionSeries = computed<BarSeries[]>(() =>
    (this.data()?.byType ?? []).map((group, index) => ({
      key: group.key,
      label: group.label,
      seriesIndex: (index % 6) + 1,
    }))
  );

  readonly consumptionData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    return [...response.consumptionOverTime]
      .sort(
        (left, right) =>
          left.localStart.localeCompare(right.localStart) ||
          left.index - right.index
      )
      .map((bucket) => {
        const date = parseLocalDate(bucket.localStart);
        const values: Record<string, number> = {};
        for (const [type, mg] of Object.entries(bucket.materialMgByType)) {
          values[type] = mg / 1000;
        }
        return {
          label: formatTickDate(date, response.granularity, true),
          fullLabel: formatTickDate(date, response.granularity, false),
          values,
        };
      });
  });

  private groupCsv(
    name: string,
    groups: { label: string; printCount: number; materialMg: number }[]
  ): CsvExport {
    return {
      filename: `analytics-materials-by-${name}.csv`,
      columns: ['Group', 'Prints', 'Filament (g)'],
      rows: groups.map((group) => [
        group.label,
        group.printCount,
        group.materialMg / 1000,
      ]),
    };
  }

  readonly byTypeCsv = computed<CsvExport>(() =>
    this.groupCsv('type', this.data()?.byType ?? [])
  );

  readonly byBrandCsv = computed<CsvExport>(() =>
    this.groupCsv('brand', this.data()?.byBrand ?? [])
  );

  readonly byColorCsv = computed<CsvExport>(() =>
    this.groupCsv('color', this.data()?.byColor ?? [])
  );

  readonly consumptionCsv = computed<CsvExport>(() => ({
    filename: 'analytics-materials-consumption.csv',
    columns: ['Period', 'Material type', 'Filament (g)'],
    rows: [...(this.data()?.consumptionOverTime ?? [])]
      .sort((left, right) => left.localStart.localeCompare(right.localStart))
      .flatMap((bucket) =>
        Object.entries(bucket.materialMgByType).map(([type, mg]) => [
          bucket.localStart,
          type,
          mg / 1000,
        ])
      ),
  }));

  readonly topSpoolsCsv = computed<CsvExport>(() => ({
    filename: 'analytics-materials-top-spools.csv',
    columns: ['Spool', 'Used (g)', 'Remaining (g)', 'Consumed (%)', 'Cost'],
    rows: (this.data()?.topSpools ?? []).map((spool) => [
      spool.label,
      spool.usedMg / 1000,
      spool.remainingMg === null ? null : spool.remainingMg / 1000,
      spool.percentConsumed,
      spool.costConsumed,
    ]),
  }));

  readonly runningLow = computed(() =>
    (this.data()?.runway ?? [])
      .filter(
        (row) => row.runwayDays !== null && row.runwayDays <= RUNNING_LOW_DAYS
      )
      .sort((left, right) => (left.runwayDays ?? 0) - (right.runwayDays ?? 0))
  );

  /**
   * Every figure on the tab in one file, which is what "export my materials for last quarter"
   * actually means. Sections reuse the per-chart exports, so the two files cannot disagree.
   */
  readonly tabCsv = computed<CsvSection[]>(() => [
    sectionOf('By type', this.byTypeCsv()),
    sectionOf('By brand', this.byBrandCsv()),
    sectionOf('By color', this.byColorCsv()),
    sectionOf('Consumption per period', this.consumptionCsv()),
    sectionOf('Top spools', this.topSpoolsCsv()),
    {
      title: 'Runway',
      columns: ['Spool', 'Remaining (g)', 'Burn rate (g/day)', 'Runway (days)'],
      rows: (this.data()?.runway ?? []).map((row) => [
        row.label,
        row.remainingGrams,
        row.burnRateGramsPerDay,
        row.runwayDays,
      ]),
    },
    {
      title: 'Waste',
      columns: ['Metric', 'Value'],
      rows: [
        ['Waste (g)', this.data()?.wasteGrams.value ?? null],
        ['Waste cost', this.data()?.wasteCost.value ?? null],
      ],
    },
  ]);

  onExportTab(): void {
    const file = buildTabCsv('analytics-materials.csv', this.tabCsv());
    downloadCsv(file.filename, file.content);
  }

  onRetry(): void {
    this.tab.retry();
  }

  /**
   * Click-through is a cross-cutting promise (spec §9), so it applies here too. The print list
   * filters by filament id, which is what a spool row and a running-low row both carry.
   *
   * The by-type / by-brand / by-color groups are NOT clickable: their keys are attribute
   * strings, and the print list has no attribute filter — a link that silently dropped its
   * filter would be worse than no link. Never sends userId (that means "public prints only").
   */
  onSpoolSelect(filamentId: string): void {
    void this.router.navigate(['/prints'], {
      queryParams: { filterByFilamentId: filamentId },
    });
  }

  grams(mg: number | null): number | null {
    return mg === null ? null : mg / 1000;
  }

  private swatchesFor(groups: MaterialGroup[]): FilamentSwatchInput[] {
    return groups.map((group) => ({
      id: group.key,
      colors: group.swatch.colors,
      colorPattern: group.swatch.colorPattern,
      finishType: group.swatch.finishType,
      effects: group.swatch.effects,
    }));
  }

  private groupData(
    groups: MaterialGroup[],
    defs: FilamentSvgDefsComponent | undefined
  ): BarDatum[] {
    return groups.map((group) => ({
      label: group.label,
      fullLabel: `${group.label} — ${(group.materialMg / 1000).toFixed(0)} g`,
      values: { value: group.materialMg / 1000 },
      // Falls back to the neutral series token before the defs component has rendered.
      fill: defs?.fillFor(group.key) ?? 'var(--chart-series-6)',
      filter: defs?.filterFor(group.key) ?? null,
      fillOpacity: defs?.opacityFor(group.key) ?? 1,
    }));
  }
}
