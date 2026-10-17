import { CurrencyPipe, DecimalPipe, formatNumber } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  ExclusionReason,
  MaterialGroup,
  MaterialsResponse,
  adjustmentMgOf,
} from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { CsvSection, buildTabCsv, sectionOf } from '../tab-csv';
import { createTabData } from '../tab-data';

/** Below this many days of stock left, a spool is worth flagging before a long print. */
const RUNNING_LOW_DAYS = 30;

/**
 * Series key for adjustments in the consumption chart. Not a plain "Adjustments": the other
 * keys are material type names, and a user's own type could be called that.
 */
const ADJUSTMENTS_KEY = '__adjustments';

/**
 * A range can hold adjustments but no group with net use (filament added back outweighs prints,
 * or only weigh-ins): that is still data to show, not an empty tab. Only an API that counts
 * adjustments can say so; for an older one the tab stays empty exactly as before.
 */
function hasAdjustmentOnlyData(response: MaterialsResponse): boolean {
  if (response.adjustmentCount === undefined) return false;
  return (
    response.topSpools.length > 0 ||
    response.consumptionOverTime.some((bucket) => adjustmentMgOf(bucket) !== 0)
  );
}

@Component({
  selector: 'app-materials-tab',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
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
  private readonly locale = inject(LOCALE_ID);

  /** Shown beside the consumption chart and read out with it. */
  readonly adjustmentsNote =
    'Adjustments are inventory corrections, such as a spool weigh-in. They are drawn as a ' +
    'separate hatched bar beside print use, and are negative when a correction added filament back.';

  private readonly tab = createTabData<MaterialsResponse>(
    this.store.filter,
    (filter) => this.analytics.getMaterials(filter),
    (response) =>
      response.byType.length === 0 && !hasAdjustmentOnlyData(response)
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  /**
   * Whether the API counts adjustments at all (#231). An older one sends no adjustmentCount, and
   * then the tab and its CSVs must look exactly as they did before: no 0 g Adjustments columns,
   * and no "net" wording on percent and cost figures that are still prints-only.
   */
  readonly supportsAdjustments = computed(
    () => this.data()?.adjustmentCount !== undefined
  );

  /**
   * The server emptied the tab because the range holds more rows than it will chart. Read from
   * rowCapExceeded, which also covers a cap tripped by adjustments alone (no prints, so nothing
   * in coverage); an older API omits it, and then the coverage exclusion is all there is.
   */
  readonly rowCapExceeded = computed(() => {
    const response = this.data();
    if (!response) return false;
    return (
      response.rowCapExceeded ??
      response.coverage.exclusions.some(
        (exclusion) => exclusion.reason === ExclusionReason.RowCapExceeded
      )
    );
  });

  /** Without the row-cap wording, an emptied tab reads as "you have no materials". */
  readonly emptyMessage = computed(() => {
    if (!this.rowCapExceeded()) {
      return 'No spool-tracked filament in this range yet.';
    }
    return this.supportsAdjustments()
      ? 'Too many prints and adjustments in this range to chart. Try a shorter date range.'
      : 'Too many prints in this range to chart. Try a shorter date range.';
  });

  /**
   * Shown in place of a group chart whose groups all have a net of zero or less, which happens
   * when filament added back outweighs print use. A blank box would read as a rendering fault.
   */
  netEmptyMessage(groups: readonly MaterialGroup[]): string {
    const reason =
      'Filament added back outweighs print use in this range, so nothing has net use to chart.';
    return groups.length > 0
      ? `${reason} The CSV export lists each group.`
      : reason;
  }

  /** Screen-reader summary for a group chart; "net" only once adjustments are counted. */
  groupAriaSummary(what: string): string {
    return this.supportsAdjustments()
      ? `Net grams of filament used per ${what}: prints plus inventory adjustments, never below zero`
      : `Grams of filament used per ${what}`;
  }

  readonly topSpoolsAriaSummary = computed(() =>
    this.supportsAdjustments()
      ? 'Most-used spools: grams printed, inventory adjustments, remaining stock, and net consumption'
      : 'Most-used spools with remaining stock'
  );

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

  /**
   * True when any period has an adjustment. Without one, the chart and its note look exactly as
   * they did before adjustments were counted, which is also what an older API produces.
   */
  readonly hasAdjustments = computed(() =>
    (this.data()?.consumptionOverTime ?? []).some(
      (bucket) => adjustmentMgOf(bucket) !== 0
    )
  );

  /**
   * One series per material type, from the categorical palette — NOT swatch-filled. Adjustments
   * are a separate SIGNED series: their own hatched bar beside the stack, which can go below
   * zero. Stacking them would let a weigh-in that added filament back silently shrink a print
   * total, and a negative segment has no meaning in a stack.
   */
  readonly consumptionSeries = computed<BarSeries[]>(() => {
    const series: BarSeries[] = (this.data()?.byType ?? []).map(
      (group, index) => ({
        key: group.key,
        label: group.label,
        seriesIndex: (index % 6) + 1,
      })
    );
    if (this.hasAdjustments()) {
      series.push({
        key: ADJUSTMENTS_KEY,
        label: 'Adjustments',
        seriesIndex: 6,
        signed: true,
      });
    }
    return series;
  });

  readonly consumptionAriaSummary = computed(() =>
    this.hasAdjustments()
      ? 'Grams of filament used per period, stacked by material type, with inventory ' +
        'adjustments (weigh-ins) as a separate bar that can be negative'
      : 'Grams of filament used per period, stacked by material type'
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
        const adjustment = adjustmentMgOf(bucket);
        if (adjustment !== 0) values[ADJUSTMENTS_KEY] = adjustment / 1000;
        return {
          label: formatTickDate(date, response.granularity, true),
          fullLabel: formatTickDate(date, response.granularity, false),
          values,
        };
      });
  });

  private groupCsv(name: string, groups: MaterialGroup[]): CsvExport {
    if (!this.supportsAdjustments()) {
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
    return {
      filename: `analytics-materials-by-${name}.csv`,
      columns: ['Group', 'Prints', 'Printed (g)', 'Adjustments (g)', 'Net (g)'],
      rows: groups.map((group) => [
        group.label,
        group.printCount,
        group.materialMg / 1000,
        adjustmentMgOf(group) / 1000,
        this.netMg(group) / 1000,
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

  readonly consumptionCsv = computed<CsvExport>(() =>
    this.supportsAdjustments()
      ? this.consumptionCsvWithAdjustments()
      : {
          filename: 'analytics-materials-consumption.csv',
          columns: ['Period', 'Material type', 'Filament (g)'],
          rows: this.sortedBuckets().flatMap((bucket) =>
            Object.entries(bucket.materialMgByType).map(([type, mg]) => [
              bucket.localStart,
              type,
              mg / 1000,
            ])
          ),
        }
  );

  private sortedBuckets() {
    return [...(this.data()?.consumptionOverTime ?? [])].sort((left, right) =>
      left.localStart.localeCompare(right.localStart)
    );
  }

  private consumptionCsvWithAdjustments = (): CsvExport => ({
    filename: 'analytics-materials-consumption.csv',
    // Long format, one row per figure: an adjustment belongs to no material type, so it is its
    // own row, told apart by Source rather than squeezed into a type column.
    columns: ['Period', 'Material type', 'Filament (g)', 'Source'],
    rows: this.sortedBuckets().flatMap((bucket) => {
      const rows: (string | number | null)[][] = Object.entries(
        bucket.materialMgByType
      ).map(([type, mg]) => [bucket.localStart, type, mg / 1000, 'Prints']);
      const adjustment = adjustmentMgOf(bucket);
      if (adjustment !== 0) {
        rows.push([bucket.localStart, null, adjustment / 1000, 'Adjustments']);
      }
      return rows;
    }),
  });

  readonly topSpoolsCsv = computed<CsvExport>(() =>
    this.supportsAdjustments()
      ? this.topSpoolsCsvWithAdjustments()
      : {
          filename: 'analytics-materials-top-spools.csv',
          columns: [
            'Spool',
            'Used (g)',
            'Remaining (g)',
            'Consumed (%)',
            'Cost',
          ],
          rows: (this.data()?.topSpools ?? []).map((spool) => [
            spool.label,
            spool.usedMg / 1000,
            spool.remainingMg === null ? null : spool.remainingMg / 1000,
            spool.percentConsumed,
            spool.costConsumed,
          ]),
        }
  );

  private topSpoolsCsvWithAdjustments = (): CsvExport => ({
    filename: 'analytics-materials-top-spools.csv',
    // The API computes percent and cost from max(0, printed + adjustments), hence "net".
    columns: [
      'Spool',
      'Printed (g)',
      'Adjustments (g)',
      'Remaining (g)',
      'Net consumed (%)',
      'Net cost',
    ],
    rows: (this.data()?.topSpools ?? []).map((spool) => [
      spool.label,
      spool.usedMg / 1000,
      adjustmentMgOf(spool) / 1000,
      spool.remainingMg === null ? null : spool.remainingMg / 1000,
      spool.percentConsumed,
      spool.costConsumed,
    ]),
  });

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

  /** "+12 g", "-5 g" or "0 g": an adjustment's sign is the point, so it is always shown. */
  signedGrams(mg: number | null | undefined): string {
    const exact = (mg ?? 0) / 1000;
    if (exact === 0) return '0 g';
    const sign = exact > 0 ? '+' : '-';
    // A real correction under a gram is not "0 g": that would read as no adjustment at all.
    if (Math.abs(exact) < 1) return `${sign}<1 g`;
    const text = formatNumber(
      Math.round(Math.abs(exact)),
      this.locale,
      '1.0-0'
    );
    return `${sign}${text} g`;
  }

  /** Prints plus adjustments, floored at zero: the most a group can have consumed is never negative. */
  netMg(group: MaterialGroup): number {
    return Math.max(0, group.materialMg + adjustmentMgOf(group));
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

  /**
   * One bar per group at its NET: prints plus adjustments, floored at zero. That is what the API
   * ranks groups by, so bar length agrees with order. Stacking prints and adjustments instead
   * cannot show a negative adjustment honestly, and a group only ever weighed in would read as
   * a 0 g print bar. A group whose net is zero (prints outweighed by filament added back) gets
   * no bar at all, never a negative one; the data table and CSV still list it.
   */
  private groupData(
    groups: MaterialGroup[],
    defs: FilamentSvgDefsComponent | undefined
  ): BarDatum[] {
    return groups
      .filter((group) => !this.supportsAdjustments() || this.netMg(group) > 0)
      .map((group) => ({
        label: group.label,
        fullLabel: this.groupLabel(group),
        values: { value: this.netMg(group) / 1000 },
        // Falls back to the neutral series token before the defs component has rendered.
        fill: defs?.fillFor(group.key) ?? 'var(--chart-series-6)',
        filter: defs?.filterFor(group.key) ?? null,
        fillOpacity: defs?.opacityFor(group.key) ?? 1,
      }));
  }

  private groupLabel(group: MaterialGroup): string {
    const adjustment = adjustmentMgOf(group);
    const net = (this.netMg(group) / 1000).toFixed(0);
    if (adjustment === 0) return `${group.label} — ${net} g`;
    const printed = (group.materialMg / 1000).toFixed(0);
    return `${group.label} — ${net} g net (${printed} g printed, ${this.signedGrams(adjustment)} adjustments)`;
  }
}
