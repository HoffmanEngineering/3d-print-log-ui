import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
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

const GAP = 2;
const TOP = 16; // room for the month labels

/**
 * Cell size is clamped, not free.
 *
 * The minimum keeps a 53-week calendar legible on a phone (below this the container scrolls
 * instead of shrinking further). The maximum is what stops a SHORT range — a week-long
 * filter is five or six columns — from inflating a handful of cells to fill a desktop
 * panel, which turns a calendar into a wall of enormous squares.
 */
const MIN_STEP = 13;
const MAX_STEP = 22;

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

  /**
   * Transparent hit area, never smaller than the cell it covers. At the minimum pitch it is
   * deliberately LARGER, so a small cell still meets the touch-target rule without the grid
   * being drawn any bigger.
   */
  readonly hitSize = computed(() => Math.max(16, this.cellSize()));

  private readonly scroller =
    viewChild<ElementRef<HTMLElement>>('calendarScroll');

  constructor() {
    // Open on the most recent week, which is the end a reader cares about. Done here rather
    // than with `direction: rtl` on the container: that also right-aligns the grid when the
    // panel is wider than the calendar, which left it stranded in the corner of the card.
    // Setting scrollLeft is inert when there is nothing to scroll.
    effect(() => {
      this.cells();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollLeft = el.scrollWidth;
    });
  }

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

  /** Week columns the grid needs, including the partial first week. */
  private readonly columns = computed(() => {
    const days = this.days();
    if (days.length === 0) return 0;
    return Math.ceil((parseLocalDate(days[0].date).getDay() + days.length) / 7);
  });

  /**
   * Grid pitch, derived from the measured panel width so the calendar grows into the space
   * it is given instead of being scaled up as a whole image.
   */
  private readonly step = computed(() => {
    const columns = this.columns();
    const available = this.width();
    if (columns === 0 || available <= 0) return MIN_STEP;

    return Math.max(
      MIN_STEP,
      Math.min(MAX_STEP, Math.floor(available / columns))
    );
  });

  readonly cellSize = computed(() => this.step() - GAP);

  readonly cells = computed<CalendarCell[]>(() => {
    const days = this.days();
    if (days.length === 0) return [];

    const first = parseLocalDate(days[0].date);
    // Column 0 is the week containing the first day, so a mid-week start does not shift
    // every subsequent weekday row by one.
    const offset = first.getDay();
    const thresholds = this.thresholds();
    const step = this.step();

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
        x: Math.floor(slot / 7) * step,
        y: TOP + (slot % 7) * step,
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

  /** The width the grid needs at the current pitch. The container scrolls when narrower. */
  readonly gridWidth = computed(() => {
    const columns = this.columns();
    return columns === 0 ? 0 : columns * this.step();
  });

  readonly gridHeight = computed(() => TOP + 7 * this.step());

  onSelect(cell: CalendarCell): void {
    this.daySelect.emit({ date: cell.date });
  }
}
