import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import * as d3 from 'd3';

export interface ScatterPoint {
  x: number;
  y: number;
  count: number;
  label: string;
}

export interface ScatterMark {
  cx: number;
  cy: number;
  r: number;
  x: number;
  y: number;
  label: string;
}

const MARGIN = { top: 8, right: 8, bottom: 28, left: 44 };
const MIN_RADIUS = 3;
const MAX_RADIUS = 14;
const HIT_RADIUS = 22; // ≥44px effective touch target

/**
 * Actual vs estimated, with the y = x reference line that turns two numbers into "over" or
 * "under" — without it this chart says nothing.
 *
 * Log scales by default: print durations span seconds to days, and a linear axis compresses
 * everything informative into the bottom-left corner. The server bins in log space too, so the
 * presentation matches the aggregation.
 */
@Component({
  selector: 'app-scatter-chart',
  templateUrl: './scatter-chart.component.html',
  styleUrls: ['./scatter-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScatterChartComponent {
  readonly points = input<ScatterPoint[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly xLabel = input('Estimated');
  readonly yLabel = input('Actual');
  readonly logScale = input(true);
  readonly referenceLine = input(true);

  readonly pointSelect = output<{ x: number; y: number }>();

  readonly hitRadius = HIT_RADIUS;
  readonly margin = MARGIN;

  private readonly usable = computed(() =>
    // A log scale is undefined at or below zero; dropping these beats emitting NaN geometry
    // that silently renders nothing and gives no clue why.
    this.points().filter(
      (p) => (this.logScale() ? p.x > 0 && p.y > 0 : true) && p.count > 0
    )
  );

  private readonly geometry = computed(() => {
    const points = this.usable();
    const width = this.width();
    const height = this.height();
    if (points.length === 0 || width <= 0 || height <= 0) return null;

    const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
    const plotHeight = Math.max(1, height - MARGIN.top - MARGIN.bottom);

    // One shared domain across both axes, so y = x is a true 45° line.
    const min = d3.min(points, (p) => Math.min(p.x, p.y)) ?? 1;
    const max = d3.max(points, (p) => Math.max(p.x, p.y)) ?? 1;
    const domain: [number, number] = [min, max === min ? min * 1.1 + 1 : max];

    const x = this.logScale()
      ? d3.scaleLog(domain, [0, plotWidth])
      : d3.scaleLinear(domain, [0, plotWidth]);
    const y = this.logScale()
      ? d3.scaleLog(domain, [plotHeight, 0])
      : d3.scaleLinear(domain, [plotHeight, 0]);

    const maxCount = d3.max(points, (p) => p.count) ?? 1;
    // sqrt so AREA tracks the count; a linear radius makes a 100-print bin an unreadable blob.
    const radius = d3
      .scaleSqrt([1, maxCount], [MIN_RADIUS, MAX_RADIUS])
      .clamp(true);

    return { x, y, radius, plotWidth, plotHeight };
  });

  readonly marks = computed<ScatterMark[]>(() => {
    const geometry = this.geometry();
    if (!geometry) return [];

    return this.usable().map((point) => ({
      cx: MARGIN.left + geometry.x(point.x),
      cy: MARGIN.top + geometry.y(point.y),
      r: geometry.radius(point.count),
      x: point.x,
      y: point.y,
      label: point.label,
    }));
  });

  readonly reference = computed(() => {
    const geometry = this.geometry();
    if (!geometry || !this.referenceLine()) return null;

    return {
      x1: MARGIN.left,
      y1: MARGIN.top + geometry.plotHeight,
      x2: MARGIN.left + geometry.plotWidth,
      y2: MARGIN.top,
    };
  });

  readonly axisTicks = computed(() => {
    const geometry = this.geometry();
    if (!geometry) return { x: [], y: [] };

    const format = (value: number) =>
      value >= 3600
        ? `${Math.round(value / 3600)}h`
        : value >= 60
          ? `${Math.round(value / 60)}m`
          : `${Math.round(value)}s`;

    return {
      x: geometry.x.ticks(4).map((value) => ({
        x: MARGIN.left + geometry.x(value),
        y: MARGIN.top + geometry.plotHeight + 16,
        text: format(value),
      })),
      y: geometry.y.ticks(4).map((value) => ({
        x: MARGIN.left - 6,
        y: MARGIN.top + geometry.y(value) + 3,
        text: format(value),
      })),
    };
  });

  onSelect(mark: ScatterMark): void {
    this.pointSelect.emit({ x: mark.x, y: mark.y });
  }
}
