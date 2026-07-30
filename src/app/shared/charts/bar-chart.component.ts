import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import * as d3 from 'd3';

export interface BarSeries {
  key: string;
  label: string;
  /** 1-6, mapped to --chart-series-N via a CSS class. */
  seriesIndex: number;
}

export interface BarDatum {
  /** Short axis label. */
  label: string;
  /** Full label for tooltips and the accessible table. */
  fullLabel: string;
  values: Record<string, number>;
}

interface Segment {
  x: number;
  y: number;
  w: number;
  h: number;
  seriesIndex: number;
  seriesKey: string;
  label: string;
  tooltip: string;
}

/**
 * Stacked bar/column chart. Scales are computed in a signal rather than drawn imperatively,
 * so the SVG is declarative Angular markup — it re-renders correctly on resize with no d3
 * DOM mutation, and marks get theme classes instead of literal fills.
 */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChartComponent {
  readonly data = input<BarDatum[]>([]);
  readonly series = input<BarSeries[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly orientation = input<'auto' | 'vertical' | 'horizontal'>('auto');

  readonly barSelect = output<{ label: string; seriesKey: string | null }>();

  /** Below this width, vertical columns cannot carry readable category labels. */
  private static readonly HorizontalBelowPx = 520;

  readonly resolvedOrientation = computed<'vertical' | 'horizontal'>(() => {
    const explicit = this.orientation();
    if (explicit !== 'auto') return explicit;
    return this.width() > 0 &&
      this.width() < BarChartComponent.HorizontalBelowPx
      ? 'horizontal'
      : 'vertical';
  });

  private readonly margin = { top: 8, right: 12, bottom: 28, left: 44 };

  readonly segments = computed<Segment[]>(() => {
    const data = this.data();
    const series = this.series();
    const w = this.width();
    const h = this.height();

    // Never draw before the container has been measured; scales would be degenerate.
    if (w <= 0 || h <= 0 || data.length === 0 || series.length === 0) return [];

    const innerW = Math.max(0, w - this.margin.left - this.margin.right);
    const innerH = Math.max(0, h - this.margin.top - this.margin.bottom);
    const max =
      d3.max(data, (d) => d3.sum(series, (s) => d.values[s.key] ?? 0)) ?? 0;
    const total = max === 0 ? 1 : max;

    const out: Segment[] = [];

    if (this.resolvedOrientation() === 'vertical') {
      const band = d3
        .scaleBand<string>()
        .domain(data.map((d) => d.label))
        .range([0, innerW])
        .padding(0.2);
      const value = d3.scaleLinear().domain([0, total]).range([innerH, 0]);

      for (const d of data) {
        let cursor = 0;
        for (const s of series) {
          const v = d.values[s.key] ?? 0;
          if (v <= 0) continue;
          const y0 = value(cursor);
          const y1 = value(cursor + v);
          out.push({
            x: this.margin.left + (band(d.label) ?? 0),
            y: this.margin.top + y1,
            w: band.bandwidth(),
            h: Math.max(1, y0 - y1),
            seriesIndex: s.seriesIndex,
            seriesKey: s.key,
            label: d.label,
            tooltip: `${d.fullLabel} — ${s.label}: ${v}`,
          });
          cursor += v;
        }
      }
    } else {
      const band = d3
        .scaleBand<string>()
        .domain(data.map((d) => d.label))
        .range([0, innerH])
        .padding(0.2);
      const value = d3.scaleLinear().domain([0, total]).range([0, innerW]);

      for (const d of data) {
        let cursor = 0;
        for (const s of series) {
          const v = d.values[s.key] ?? 0;
          if (v <= 0) continue;
          out.push({
            x: this.margin.left + value(cursor),
            y: this.margin.top + (band(d.label) ?? 0),
            w: Math.max(1, value(v)),
            h: band.bandwidth(),
            seriesIndex: s.seriesIndex,
            seriesKey: s.key,
            label: d.label,
            tooltip: `${d.fullLabel} — ${s.label}: ${v}`,
          });
          cursor += v;
        }
      }
    }

    return out;
  });

  readonly axisLabels = computed(() => {
    const data = this.data();
    const w = this.width();
    const h = this.height();
    if (w <= 0 || h <= 0 || data.length === 0) return [];

    const innerW = Math.max(0, w - this.margin.left - this.margin.right);
    const innerH = Math.max(0, h - this.margin.top - this.margin.bottom);
    const vertical = this.resolvedOrientation() === 'vertical';

    const band = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range(vertical ? [0, innerW] : [0, innerH])
      .padding(0.2);

    // Show every nth label so they never collide; the tooltip carries the rest.
    const capacity = vertical
      ? Math.max(1, Math.floor(innerW / 48))
      : Math.max(1, Math.floor(innerH / 24));
    const step = Math.ceil(data.length / capacity);

    return data
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        text: d.label,
        x: vertical
          ? this.margin.left + (band(d.label) ?? 0) + band.bandwidth() / 2
          : this.margin.left - 6,
        y: vertical
          ? this.margin.top + innerH + 18
          : this.margin.top + (band(d.label) ?? 0) + band.bandwidth() / 2 + 4,
        anchor: vertical ? 'middle' : 'end',
      }));
  });

  onSelect(segment: Segment): void {
    this.barSelect.emit({ label: segment.label, seriesKey: segment.seriesKey });
  }
}
