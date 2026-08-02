import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatrixCell } from 'src/app/analytics/models/analytics.models';

export interface RenderedMatrixCell {
  weekday: number;
  hour: number;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
  label: string;
}

const ROW_LABEL_WIDTH = 34;
const COLUMN_LABEL_HEIGHT = 14;

/**
 * A fixed row × column matrix that fills its container. Unlike the calendar heatmap this never
 * scrolls and both axes are labeled, so the two are separate components rather than one with a
 * mode flag controlling layout, labels, sizing and overflow.
 *
 * Levels are scaled against the busiest cell, which is the honest scale here: the question the
 * chart answers is "when, relative to my own busiest hour, do I print?".
 */
@Component({
  selector: 'app-matrix-heatmap',
  templateUrl: './matrix-heatmap.component.html',
  styleUrls: ['./matrix-heatmap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatrixHeatmapComponent {
  readonly cells = input<MatrixCell[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly rowLabels = input<string[]>([]);
  readonly columnLabels = input<string[]>([]);

  readonly cellSelect = output<{ weekday: number; hour: number }>();

  readonly rowLabelWidth = ROW_LABEL_WIDTH;
  readonly columnLabelHeight = COLUMN_LABEL_HEIGHT;

  readonly rendered = computed<RenderedMatrixCell[]>(() => {
    const cells = this.cells();
    const rows = this.rowLabels().length;
    const columns = this.columnLabels().length;
    const width = this.width();
    const height = this.height();

    if (
      cells.length === 0 ||
      rows === 0 ||
      columns === 0 ||
      width <= 0 ||
      height <= 0
    ) {
      return [];
    }

    const plotWidth = Math.max(0, width - ROW_LABEL_WIDTH);
    const plotHeight = Math.max(0, height - COLUMN_LABEL_HEIGHT);
    const cellWidth = plotWidth / columns;
    const cellHeight = plotHeight / rows;

    const max = cells.reduce((peak, c) => Math.max(peak, c.count), 0);

    return cells.map((cell) => ({
      weekday: cell.weekday,
      hour: cell.hour,
      count: cell.count,
      x: ROW_LABEL_WIDTH + cell.hour * cellWidth,
      y: COLUMN_LABEL_HEIGHT + cell.weekday * cellHeight,
      w: Math.max(1, cellWidth - 1),
      h: Math.max(1, cellHeight - 1),
      level:
        cell.count === 0 || max === 0
          ? 0
          : Math.max(1, Math.ceil((cell.count / max) * 4)),
      label: `${this.rowLabels()[cell.weekday] ?? cell.weekday} ${this.columnLabels()[cell.hour] ?? cell.hour}: ${cell.count} print${cell.count === 1 ? '' : 's'}`,
    }));
  });

  /** Every third hour, so labels never collide on a narrow container. */
  readonly visibleColumnLabels = computed(() =>
    this.columnLabels()
      .map((text, index) => ({ text, index }))
      .filter((c) => c.index % 3 === 0)
  );

  readonly cellWidth = computed(() => {
    const columns = this.columnLabels().length;
    return columns === 0
      ? 0
      : Math.max(0, this.width() - ROW_LABEL_WIDTH) / columns;
  });

  readonly cellHeight = computed(() => {
    const rows = this.rowLabels().length;
    return rows === 0
      ? 0
      : Math.max(0, this.height() - COLUMN_LABEL_HEIGHT) / rows;
  });

  onSelect(cell: RenderedMatrixCell): void {
    this.cellSelect.emit({ weekday: cell.weekday, hour: cell.hour });
  }
}
