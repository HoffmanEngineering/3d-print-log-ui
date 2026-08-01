import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';
import {
  BarChartComponent,
  BarDatum,
  BarSeries,
} from 'src/app/shared/charts/bar-chart.component';
import { CalendarHeatmapComponent } from 'src/app/shared/charts/calendar-heatmap.component';
import {
  formatTickDate,
  parseLocalDate,
} from 'src/app/shared/charts/chart-axis';
import { CsvExport } from 'src/app/shared/charts/chart-export';
import { ChartFrameComponent } from 'src/app/shared/charts/chart-frame.component';
import { MatrixHeatmapComponent } from 'src/app/shared/charts/matrix-heatmap.component';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { ActivityResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { createTabData } from '../tab-data';

export type ActivityMetric = 'count' | 'time' | 'filament' | 'cost';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, hour) => `${hour}`);

@Component({
  selector: 'app-activity-tab',
  imports: [
    BarChartComponent,
    CalendarHeatmapComponent,
    ChartFrameComponent,
    MatButtonToggleModule,
    MatrixHeatmapComponent,
  ],
  templateUrl: './activity-tab.component.html',
  styleUrls: ['./activity-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityTabComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly router = inject(Router);

  private readonly tab = createTabData<ActivityResponse>(
    this.store.filter,
    (filter) => this.analytics.getActivity(filter),
    (response) => response.series.every((bucket) => bucket.count === 0)
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  /**
   * The metric toggle is a pure client-side switch: all four numbers ship in one payload, so
   * switching is instant AND the four figures are guaranteed to describe the same prints.
   */
  readonly metric = signal<ActivityMetric>('count');

  readonly weekdays = WEEKDAYS;
  readonly hours = HOURS;

  readonly seriesLabels: Record<ActivityMetric, string> = {
    count: 'Prints',
    time: 'Print time (seconds)',
    filament: 'Filament (grams)',
    cost: 'Cost',
  };

  readonly series: readonly BarSeries[] = [
    { key: 'value', label: 'Value', seriesIndex: 1 },
  ];

  /** Cost is unavailable when the server hit its cost row cap and nulled the whole series. */
  readonly costAvailable = computed(() =>
    (this.data()?.series ?? []).some((bucket) => bucket.cost !== null)
  );

  readonly seriesData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    const metric = this.metric();
    return (
      [...response.series]
        // API response order is not display order (spec §11). Sort by the civil localStart.
        .sort(
          (left, right) =>
            left.localStart.localeCompare(right.localStart) ||
            left.index - right.index
        )
        .map((bucket) => {
          const date = parseLocalDate(bucket.localStart);
          const value =
            metric === 'count'
              ? bucket.count
              : metric === 'time'
                ? bucket.durationSeconds
                : metric === 'filament'
                  ? bucket.materialMg / 1000
                  : (bucket.cost ?? 0);

          return {
            label: formatTickDate(date, response.granularity, true),
            fullLabel: formatTickDate(date, response.granularity, false),
            values: { value },
          };
        })
    );
  });

  readonly histogramData = computed<BarDatum[]>(() =>
    (this.data()?.durationHistogram ?? []).map((bucket) => ({
      label: bucket.label,
      fullLabel: bucket.label,
      values: { value: bucket.count },
    }))
  );

  readonly streakSummary = computed(() => {
    const streaks = this.data()?.streaks;
    if (!streaks) return '';

    const day = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
    const parts = [
      `Current streak ${day(streaks.currentDays)}`,
      `Longest streak ${day(streaks.longestDays)}`,
    ];

    if (streaks.busiestDate) {
      parts.push(
        `Busiest day ${parseLocalDate(streaks.busiestDate).toLocaleDateString(
          undefined,
          {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }
        )} (${streaks.busiestDateCount})`
      );
    }
    if (streaks.busiestWeekday !== null) {
      parts.push(`Busiest weekday ${WEEKDAYS[streaks.busiestWeekday]}`);
    }

    return parts.join(' · ');
  });

  readonly seriesCsv = computed<CsvExport>(() => ({
    filename: 'analytics-activity-series.csv',
    columns: ['Period', 'Prints', 'Print time (s)', 'Filament (g)', 'Cost'],
    rows: [...(this.data()?.series ?? [])]
      .sort((left, right) => left.localStart.localeCompare(right.localStart))
      .map((bucket) => [
        bucket.localStart,
        bucket.count,
        bucket.durationSeconds,
        bucket.materialMg / 1000,
        bucket.cost,
      ]),
  }));

  readonly calendarCsv = computed<CsvExport>(() => ({
    filename: 'analytics-activity-calendar.csv',
    columns: ['Date', 'Prints'],
    rows: [...(this.data()?.calendar ?? [])]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((day) => [day.date, day.count]),
  }));

  readonly histogramCsv = computed<CsvExport>(() => ({
    filename: 'analytics-activity-durations.csv',
    columns: ['Duration', 'Prints'],
    rows: (this.data()?.durationHistogram ?? []).map((bucket) => [
      bucket.label,
      bucket.count,
    ]),
  }));

  readonly matrixCsv = computed<CsvExport>(() => ({
    filename: 'analytics-activity-start-times.csv',
    columns: ['Weekday (0=Sunday)', 'Hour', 'Prints'],
    rows: (this.data()?.startTimeMatrix ?? []).map((cell) => [
      cell.weekday,
      cell.hour,
      cell.count,
    ]),
  }));

  readonly seriesAriaSummary = computed(() => {
    const response = this.data();
    if (!response) return '';
    return `${this.seriesLabels[this.metric()]} across ${response.series.length} ${response.granularity.toLowerCase()} periods`;
  });

  setMetric(metric: ActivityMetric): void {
    this.metric.set(metric);
  }

  onRetry(): void {
    this.tab.retry();
  }

  /**
   * A calendar day links to that day's prints. Never sends userId: /api/Prints/summary reads
   * one as "show this user's PUBLIC prints", which would silently narrow the user's own list.
   */
  onDaySelect(event: { date: string }): void {
    const from = parseLocalDate(event.date);
    const to = new Date(from);
    to.setDate(to.getDate() + 1); // half-open, matching the API contract

    void this.router.navigate(['/prints'], {
      queryParams: { fromDate: from.toISOString(), toDate: to.toISOString() },
    });
  }
}
