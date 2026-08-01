import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { PrintStatus } from 'src/app/core/services/print.service';
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
  DonutChartComponent,
  DonutSlice,
} from 'src/app/shared/charts/donut-chart.component';
import { StatTileComponent } from 'src/app/shared/charts/stat-tile.component';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { OverviewResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { CsvSection, buildTabCsv, sectionOf } from '../tab-csv';
import { createTabData } from '../tab-data';

/**
 * Status ordering and colour assignment are fixed here so the donut, the stacked bars, and
 * the legend always agree — a status must not change colour between two charts on one screen.
 */
const STATUS_SERIES: readonly {
  key: string;
  label: string;
  seriesIndex: number;
  status: PrintStatus;
}[] = [
  {
    key: 'Success',
    label: 'Success',
    seriesIndex: 3,
    status: PrintStatus.Success,
  },
  {
    key: 'PartialSuccess',
    label: 'Partial success',
    seriesIndex: 2,
    status: PrintStatus.PartialSuccess,
  },
  {
    key: 'Failed',
    label: 'Failed',
    seriesIndex: 4,
    status: PrintStatus.Failed,
  },
  {
    key: 'Cancelled',
    label: 'Cancelled',
    seriesIndex: 6,
    status: PrintStatus.Cancelled,
  },
  {
    key: 'Printing',
    label: 'Printing',
    seriesIndex: 1,
    status: PrintStatus.Printing,
  },
  {
    key: 'Pending',
    label: 'Pending',
    seriesIndex: 5,
    status: PrintStatus.Pending,
  },
];

@Component({
  selector: 'app-overview-tab',
  imports: [
    MatButtonModule,
    BarChartComponent,
    ChartFrameComponent,
    DonutChartComponent,
    StatTileComponent,
  ],
  templateUrl: './overview-tab.component.html',
  styleUrls: ['./overview-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly router = inject(Router);

  // Field initializers run in an injection context, which is what takeUntilDestroyed inside
  // createTabData needs. The debounce/cancel/discard-stale rules live in that one helper so
  // six tabs cannot each get them subtly wrong.
  private readonly tab = createTabData<OverviewResponse>(
    this.store.filter,
    (filter) => this.analytics.getOverview(filter),
    (response) => (response.tiles.printCount.value ?? 0) === 0
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  readonly statusSeries: readonly BarSeries[] = STATUS_SERIES.map((s) => ({
    key: s.key,
    label: s.label,
    seriesIndex: s.seriesIndex,
  }));

  readonly barData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    const granularity = response.granularity;
    return [...response.series]
      .sort(
        (left, right) =>
          left.localStart.localeCompare(right.localStart) ||
          left.index - right.index
      )
      .map((bucket) => {
        // localStart is a civil date the server already resolved in the user's timezone;
        // parsing it as UTC would shift the label a day west of UTC.
        const date = parseLocalDate(bucket.localStart);
        return {
          label: formatTickDate(date, granularity, true),
          fullLabel: formatTickDate(date, granularity, false),
          values: bucket.countsByStatus,
        };
      });
  });

  readonly donutSlices = computed<DonutSlice[]>(() => {
    const breakdown = this.data()?.statusBreakdown ?? [];
    const byStatus = new Map(breakdown.map((s) => [s.status, s.count]));

    return STATUS_SERIES.map((s) => ({
      key: s.key,
      label: s.label,
      value: byStatus.get(s.key) ?? 0,
      seriesIndex: s.seriesIndex,
    }));
  });

  readonly highlights = computed(() => {
    const h = this.data()?.highlights;
    if (!h) return [];

    return [
      { caption: 'Most used printer', ref: h.mostUsedPrinter },
      { caption: 'Most used material', ref: h.mostUsedMaterial },
      { caption: 'Longest print', ref: h.longestPrint },
      // Populated from the same costing pass the cost tile uses, so the two can never disagree.
      { caption: 'Priciest print', ref: h.priciestPrint },
    ].filter((item) => item.ref !== null);
  });

  /** The six tiles, flattened for the tab-level CSV. */
  readonly tileRows = computed<(string | number | null)[][]>(() => {
    const tiles = this.data()?.tiles;
    if (!tiles) return [];

    return [
      ['Prints', tiles.printCount.value, tiles.printCount.previous],
      [
        'Success rate (%)',
        tiles.successRatePercent.value,
        tiles.successRatePercent.previous,
      ],
      ['Filament (g)', tiles.filamentGrams.value, tiles.filamentGrams.previous],
      [
        'Print time (s)',
        tiles.printTimeSeconds.value,
        tiles.printTimeSeconds.previous,
      ],
      ['Total cost', tiles.totalCost.value, tiles.totalCost.previous],
      [
        'Average print time (s)',
        tiles.avgPrintTimeSeconds.value,
        tiles.avgPrintTimeSeconds.previous,
      ],
    ];
  });

  readonly seriesCsv = computed<CsvExport>(() => ({
    filename: 'analytics-overview-prints-over-time.csv',
    columns: ['Period', 'Status', 'Prints'],
    rows: [...(this.data()?.series ?? [])]
      .sort((left, right) => left.localStart.localeCompare(right.localStart))
      .flatMap((bucket) =>
        Object.entries(bucket.countsByStatus).map(([status, count]) => [
          bucket.localStart,
          status,
          count,
        ])
      ),
  }));

  readonly statusCsv = computed<CsvExport>(() => ({
    filename: 'analytics-overview-outcomes.csv',
    columns: ['Status', 'Prints'],
    rows: (this.data()?.statusBreakdown ?? []).map((entry) => [
      entry.status,
      entry.count,
    ]),
  }));

  readonly seriesAriaSummary = computed(() => {
    const response = this.data();
    if (!response) return '';
    const total = response.tiles.printCount.value ?? 0;
    return `${total} prints across ${response.series.length} ${response.granularity.toLowerCase()} buckets`;
  });

  /**
   * Every figure on the tab in one file, which is what "export my overview for last quarter"
   * actually means. Sections reuse the per-chart exports, so the two files cannot disagree.
   */
  readonly tabCsv = computed<CsvSection[]>(() => [
    {
      title: 'Tiles',
      columns: ['Metric', 'Value', 'Previous'],
      rows: this.tileRows(),
    },
    sectionOf('Prints per period by status', this.seriesCsv()),
    sectionOf('Status breakdown', this.statusCsv()),
    {
      title: 'Highlights',
      columns: ['Highlight', 'Label', 'Value', 'Unit'],
      rows: this.highlights().map((item) => [
        item.caption,
        item.ref?.label ?? null,
        item.ref?.value ?? null,
        item.ref?.unit ?? null,
      ]),
    },
  ]);

  onExportTab(): void {
    const file = buildTabCsv('analytics-overview.csv', this.tabCsv());
    downloadCsv(file.filename, file.content);
  }

  onRetry(): void {
    this.tab.retry();
  }

  /** Bar click-through: the bucket's status, within the current range. */
  onBarSelect(event: { label: string; seriesKey: string | null }): void {
    this.navigateToPrints(event.seriesKey);
  }

  onSliceSelect(event: { key: string }): void {
    this.navigateToPrints(event.key);
  }

  /**
   * Uses `filterByStatus` — SINGULAR — because that is what the print list actually reads
   * (print-list-resolver.service.ts and print-list.component.ts both bind the singular form).
   * The plural `filterByStatuses` exists on the API but has no client consumer yet, so sending
   * it produced a link that looked filtered and wasn't.
   *
   * The date range is deliberately NOT forwarded: the print list has no concept of one — not
   * in its resolver, its service, or its filter panel — so those params would be dropped
   * silently and imply a narrowing that never happened. Carrying the range through is a print
   * list feature; the API side already supports it (/api/Prints/summary takes fromDate/toDate).
   *
   * Never sends a userId: /api/Prints/summary treats one as "show this user's PUBLIC prints",
   * which would silently narrow the user's own list to what they have published.
   */
  private navigateToPrints(statusKey: string | null): void {
    const status = STATUS_SERIES.find((s) => s.key === statusKey)?.status;
    if (status === undefined) return;

    void this.router.navigate(['/prints'], {
      queryParams: { filterByStatus: status },
    });
  }
}
