import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
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
  ScatterChartComponent,
  ScatterPoint,
} from 'src/app/shared/charts/scatter-chart.component';
import { StatTileComponent } from 'src/app/shared/charts/stat-tile.component';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import {
  AccuracyCallout,
  AccuracyResponse,
} from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { CsvSection, buildTabCsv, sectionOf } from '../tab-csv';
import { createTabData } from '../tab-data';

/** Below this the scatter's hit areas overlap and it stops being readable (spec §11). */
const SCATTER_MIN_WIDTH = 600;

@Component({
  selector: 'app-accuracy-tab',
  imports: [
    MatButtonModule,
    BarChartComponent,
    ChartFrameComponent,
    ScatterChartComponent,
    StatTileComponent,
  ],
  templateUrl: './accuracy-tab.component.html',
  styleUrls: ['./accuracy-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccuracyTabComponent implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly router = inject(Router);

  private readonly tab = createTabData<AccuracyResponse>(
    this.store.filter,
    (filter) => this.analytics.getAccuracy(filter),
    (response) =>
      response.timeAccuracyMedian.value === null &&
      response.materialAccuracyMedian.value === null
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  private readonly host = viewChild<ElementRef<HTMLElement>>('accuracyHost');
  private observer?: ResizeObserver;

  /** Measured from the container, not the window — the side nav changes width on its own. */
  readonly containerWidth = signal(SCATTER_MIN_WIDTH + 1);

  constructor() {
    effect(() => {
      const el = this.host()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;

      this.observer?.disconnect();
      this.observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect) this.containerWidth.set(Math.floor(rect.width));
      });
      this.observer.observe(el);
    });
  }

  readonly showScatter = computed(
    () => this.containerWidth() >= SCATTER_MIN_WIDTH
  );

  readonly singleSeries: readonly BarSeries[] = [
    { key: 'value', label: 'Actual ÷ estimated', seriesIndex: 1 },
  ];

  readonly scatterPoints = computed<ScatterPoint[]>(() =>
    (this.data()?.timeScatter ?? []).map((bin) => ({
      x: bin.estimated,
      y: bin.actual,
      count: bin.count,
      label: `${bin.count} print${bin.count === 1 ? '' : 's'}: estimated ${Math.round(
        bin.estimated / 60
      )} min, actual ${Math.round(bin.actual / 60)} min`,
    }))
  );

  readonly byPrinterData = computed<BarDatum[]>(() =>
    (this.data()?.byPrinter ?? [])
      .filter((group) => group.medianRatio !== null)
      .map((group) => ({
        label: group.label,
        fullLabel: `${group.label} (n=${group.sampleSize})`,
        values: { value: group.medianRatio as number },
      }))
  );

  readonly biasTrendData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    return [...response.biasTrend]
      .sort(
        (left, right) =>
          left.localStart.localeCompare(right.localStart) ||
          left.index - right.index
      )
      .filter((bucket) => bucket.medianRatio !== null)
      .map((bucket) => {
        const date = parseLocalDate(bucket.localStart);
        return {
          label: formatTickDate(date, response.granularity, true),
          fullLabel: `${formatTickDate(date, response.granularity, false)} (n=${bucket.sampleSize})`,
          values: { value: bucket.medianRatio as number },
        };
      });
  });

  readonly scatterCsv = computed<CsvExport>(() => ({
    filename: 'analytics-accuracy-time-scatter.csv',
    columns: ['Estimated (s)', 'Actual (s)', 'Prints'],
    rows: (this.data()?.timeScatter ?? []).map((bin) => [
      bin.estimated,
      bin.actual,
      bin.count,
    ]),
  }));

  readonly biasTrendCsv = computed<CsvExport>(() => ({
    filename: 'analytics-accuracy-bias-trend.csv',
    columns: ['Period', 'Median actual / estimated', 'Sample size'],
    rows: [...(this.data()?.biasTrend ?? [])]
      .sort((left, right) => left.localStart.localeCompare(right.localStart))
      .map((bucket) => [
        bucket.localStart,
        bucket.medianRatio,
        bucket.sampleSize,
      ]),
  }));

  readonly groupsCsv = computed<CsvExport>(() => ({
    filename: 'analytics-accuracy-by-group.csv',
    columns: ['Scope', 'Group', 'Median actual / estimated', 'Sample size'],
    rows: [
      ...(this.data()?.byPrinter ?? []),
      ...(this.data()?.byMaterial ?? []),
    ].map((group) => [
      group.scope,
      group.label,
      group.medianRatio,
      group.sampleSize,
    ]),
  }));

  /**
   * The sentence is composed here, from the server's structured facts. Plain language belongs
   * where units and translation already live; the API never ships prose.
   */
  readonly calloutMessages = computed(() =>
    (this.data()?.callouts ?? []).map((callout) => this.compose(callout))
  );

  private compose(callout: AccuracyCallout): string {
    const deviation = Math.round(Math.abs(callout.medianRatio - 1) * 100);

    return callout.dimension === 'time'
      ? `Your ${callout.label} runs about ${deviation}% ${
          callout.medianRatio > 1 ? 'longer' : 'shorter'
        } than estimated (${callout.sampleSize} prints).`
      : `${callout.label} uses about ${deviation}% ${
          callout.medianRatio > 1 ? 'more' : 'less'
        } material than estimated (${callout.sampleSize} prints).`;
  }

  /**
   * `BarChartComponent` emits the datum's LABEL, not an id, so the printer id has to be
   * recovered here. Labels are not guaranteed unique — two printers can share a name — so the
   * lookup resolves to a single unambiguous match and does nothing otherwise. Navigating to
   * "whichever printer happened to sort first" would be worse than not navigating.
   */
  onBarSelect(event: { label: string; seriesKey: string | null }): void {
    const matches = (this.data()?.byPrinter ?? []).filter(
      (group) => group.label === event.label
    );
    if (matches.length !== 1) return;
    this.onPrinterSelect(matches[0].key);
  }

  /**
   * Every figure on the tab in one file, which is what "export my accuracy for last quarter"
   * actually means. Sections reuse the per-chart exports, so the two files cannot disagree.
   */
  readonly tabCsv = computed<CsvSection[]>(() => [
    {
      title: 'Medians',
      columns: ['Metric', 'Value'],
      rows: [
        ['Time accuracy', this.data()?.timeAccuracyMedian.value ?? null],
        [
          'Material accuracy',
          this.data()?.materialAccuracyMedian.value ?? null,
        ],
      ],
    },
    sectionOf('By group', this.groupsCsv()),
    sectionOf('Bias trend', this.biasTrendCsv()),
    sectionOf('Scatter bins', this.scatterCsv()),
  ]);

  onExportTab(): void {
    const file = buildTabCsv('analytics-accuracy.csv', this.tabCsv());
    downloadCsv(file.filename, file.content);
  }

  onRetry(): void {
    this.tab.retry();
  }

  /**
   * Click-through from a by-printer bar to that printer's prints (spec §9).
   *
   * The scatter is deliberately NOT clickable: a bin is a group of prints sharing a duration
   * range, and the print list cannot filter on that — a link that dropped its filter and showed
   * everything would be worse than no link. The by-printer bars carry an id the list understands.
   * Never sends userId (that means "public prints only").
   */
  onPrinterSelect(printerId: string): void {
    void this.router.navigate(['/prints'], {
      queryParams: { filterByPrinterId: printerId },
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
