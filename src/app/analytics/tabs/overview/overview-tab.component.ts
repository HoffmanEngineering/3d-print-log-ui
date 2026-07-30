import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';
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
import {
  ChartFrameComponent,
  ChartState,
} from 'src/app/shared/charts/chart-frame.component';
import {
  DonutChartComponent,
  DonutSlice,
} from 'src/app/shared/charts/donut-chart.component';
import { StatTileComponent } from 'src/app/shared/charts/stat-tile.component';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { OverviewResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';

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

  readonly data = signal<OverviewResponse | null>(null);
  readonly state = signal<ChartState>('loading');

  readonly retry$ = new Subject<void>();

  readonly statusSeries: readonly BarSeries[] = STATUS_SERIES.map((s) => ({
    key: s.key,
    label: s.label,
    seriesIndex: s.seriesIndex,
  }));

  constructor() {
    // debounce + switchMap: switchMap cancels the in-flight request AND guarantees a late
    // response from a superseded request can never be applied over a newer one.
    toObservable(this.store.filter)
      .pipe(
        debounceTime(250),
        switchMap((filter) =>
          merge(of(filter), this.retry$.pipe(map(() => filter)))
        ),
        tap(() => this.state.set('loading')),
        switchMap((filter) =>
          this.analytics.getOverview(filter).pipe(
            catchError(() => {
              this.state.set('error');
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((response) => {
        this.data.set(response);
        this.state.set(
          (response.tiles.printCount.value ?? 0) === 0 ? 'empty' : 'ready'
        );
      });
  }

  readonly barData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    const granularity = response.granularity;
    return response.series.map((bucket) => {
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
    ].filter((item) => item.ref !== null);
  });

  readonly seriesAriaSummary = computed(() => {
    const response = this.data();
    if (!response) return '';
    const total = response.tiles.printCount.value ?? 0;
    return `${total} prints across ${response.series.length} ${response.granularity.toLowerCase()} buckets`;
  });

  onRetry(): void {
    this.retry$.next();
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
