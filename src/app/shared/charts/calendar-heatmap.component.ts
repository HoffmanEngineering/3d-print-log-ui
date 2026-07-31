import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CalendarDay } from 'src/app/analytics/models/analytics.models';
import { parseLocalDate } from './chart-axis';

export interface CalendarCell {
  date: string;
  count: number;
  x: number;
  y: number;
  /** 0 = nothing happened; 1-4 are quantile steps over the non-zero days. */
  level: number;
  label: string;
}

export interface CalendarMonthLabel {
  x: number;
  text: string;
}

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const TOP = 16; // room for the month labels

/**
 * A GitHub-style activity calendar: one column per week, one row per weekday with Sunday at the
 * top, so reading left to right is reading forward in time.
 *
 * Levels are QUANTILE-based over the non-zero days. A linear ramp is unreadable on real data:
 * one 40-print day and three hundred 1-print days would render as a single bright square in a
 * field of identical faint ones. Level 0 is reserved for zero, so "nothing happened" can never
 * be mistaken for "a little happened".
 */
@Component({
  selector: 'app-calendar-heatmap',
  templateUrl: './calendar-heatmap.component.html',
  styleUrls: ['./calendar-heatmap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarHeatmapComponent {
  readonly days = input<CalendarDay[]>([]);
  readonly width = input(0);
  readonly height = input(0);

  readonly daySelect = output<{ date: string }>();

  /** Enlarged transparent hit area, so a 11px cell still meets the touch-target rule. */
  readonly hitSize = 16;

  private readonly thresholds = computed(() => {
    const active = this.days()
      .map((d) => d.count)
      .filter((c) => c > 0)
      .sort((a, b) => a - b);

    if (active.length === 0) return [] as number[];

    const at = (q: number) =>
      active[Math.min(active.length - 1, Math.floor(q * active.length))];
    return [at(0.25), at(0.5), at(0.75)];
  });

  readonly cells = computed<CalendarCell[]>(() => {
    const days = this.days();
    if (days.length === 0) return [];

    const first = parseLocalDate(days[0].date);
    // Column 0 is the week containing the first day, so a mid-week start does not shift
    // every subsequent weekday row by one.
    const offset = first.getDay();
    const thresholds = this.thresholds();

    return days.map((day, index) => {
      const slot = index + offset;
      const level =
        day.count === 0
          ? 0
          : thresholds.length === 0
            ? 4
            : day.count <= thresholds[0]
              ? 1
              : day.count <= thresholds[1]
                ? 2
                : day.count <= thresholds[2]
                  ? 3
                  : 4;

      const date = parseLocalDate(day.date);
      return {
        date: day.date,
        count: day.count,
        x: Math.floor(slot / 7) * STEP,
        y: TOP + (slot % 7) * STEP,
        level,
        label: `${date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}: ${day.count} print${day.count === 1 ? '' : 's'}`,
      };
    });
  });

  readonly monthLabels = computed<CalendarMonthLabel[]>(() => {
    const labels: CalendarMonthLabel[] = [];
    let lastMonth = -1;

    for (const cell of this.cells()) {
      const date = parseLocalDate(cell.date);
      if (date.getMonth() === lastMonth) continue;
      lastMonth = date.getMonth();
      labels.push({
        x: cell.x,
        text: date.toLocaleDateString(undefined, { month: 'short' }),
      });
    }

    return labels;
  });

  /** The intrinsic width the grid needs. The container scrolls when it is narrower. */
  readonly gridWidth = computed(() => {
    const cells = this.cells();
    return cells.length === 0 ? 0 : cells[cells.length - 1].x + CELL;
  });

  readonly gridHeight = TOP + 7 * STEP;

  readonly cellSize = CELL;

  onSelect(cell: CalendarCell): void {
    this.daySelect.emit({ date: cell.date });
  }
}
