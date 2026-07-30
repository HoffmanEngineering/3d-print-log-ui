import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import * as d3 from 'd3';
import {
  TickGranularity,
  formatTickDate,
  tickCountForWidth,
} from './chart-axis';

export interface LinePoint {
  /** ISO date string; the bucket's local start. */
  date: string;
  value: number;
}

interface PlottedPoint {
  cx: number;
  cy: number;
  date: string;
  tooltip: string;
}

interface AxisTick {
  x: number;
  y: number;
  text: string;
}

/**
 * Line/area time series. Like the bar chart, everything is derived in computed() signals and
 * rendered as declarative SVG — d3 supplies the scales and path generators only, never DOM
 * mutation, so resize and theme changes need no imperative redraw.
 */
@Component({
  selector: 'app-line-area-chart',
  templateUrl: './line-area-chart.component.html',
  styleUrls: ['./line-area-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineAreaChartComponent {
  readonly points = input<LinePoint[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly granularity = input<TickGranularity>('Day');
  readonly area = input(true);
  readonly valueLabel = input('Value');

  readonly pointSelect = output<{ date: string }>();

  private readonly margin = { top: 8, right: 12, bottom: 28, left: 44 };

  /** Null until measured and non-empty, so the template renders nothing rather than NaN paths. */
  private readonly geometry = computed(() => {
    const points = this.points();
    const w = this.width();
    const h = this.height();
    if (w <= 0 || h <= 0 || points.length === 0) return null;

    const parsed = points
      .map((p) => ({ ...p, parsed: new Date(p.date) }))
      .filter((p) => !Number.isNaN(p.parsed.getTime()));
    if (parsed.length === 0) return null;

    const innerW = Math.max(0, w - this.margin.left - this.margin.right);
    const innerH = Math.max(0, h - this.margin.top - this.margin.bottom);

    const extent = d3.extent(parsed, (p) => p.parsed) as [Date, Date];
    // A single point has a zero-width domain, which maps every x to NaN. Give it a day.
    const domain: [Date, Date] =
      extent[0].getTime() === extent[1].getTime()
        ? [extent[0], new Date(extent[1].getTime() + 86_400_000)]
        : extent;

    const x = d3.scaleTime().domain(domain).range([0, innerW]);
    const maxValue = d3.max(parsed, (p) => p.value) ?? 0;
    const y = d3
      .scaleLinear()
      .domain([0, maxValue === 0 ? 1 : maxValue])
      .nice()
      .range([innerH, 0]);

    return { parsed, x, y, innerW, innerH };
  });

  readonly linePath = computed(() => {
    const g = this.geometry();
    if (!g) return null;

    return (
      d3
        .line<(typeof g.parsed)[number]>()
        .x((p) => this.margin.left + g.x(p.parsed))
        .y((p) => this.margin.top + g.y(p.value))(g.parsed) ?? null
    );
  });

  readonly areaPath = computed(() => {
    const g = this.geometry();
    if (!g || !this.area()) return null;

    return (
      d3
        .area<(typeof g.parsed)[number]>()
        .x((p) => this.margin.left + g.x(p.parsed))
        .y0(this.margin.top + g.innerH)
        .y1((p) => this.margin.top + g.y(p.value))(g.parsed) ?? null
    );
  });

  readonly plotted = computed<PlottedPoint[]>(() => {
    const g = this.geometry();
    if (!g) return [];

    return g.parsed.map((p) => ({
      cx: this.margin.left + g.x(p.parsed),
      cy: this.margin.top + g.y(p.value),
      date: p.date,
      tooltip: `${p.parsed.toLocaleDateString()} — ${this.valueLabel()}: ${p.value}`,
    }));
  });

  readonly axisTicks = computed<AxisTick[]>(() => {
    const g = this.geometry();
    if (!g) return [];

    const compact = this.width() < 520;
    return g.x.ticks(tickCountForWidth(this.width())).map((tick) => ({
      x: this.margin.left + g.x(tick),
      y: this.margin.top + g.innerH + 18,
      text: formatTickDate(tick, this.granularity(), compact),
    }));
  });

  onSelect(point: PlottedPoint): void {
    this.pointSelect.emit({ date: point.date });
  }
}
