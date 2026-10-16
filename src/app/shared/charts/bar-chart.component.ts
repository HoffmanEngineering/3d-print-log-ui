import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  isDevMode,
  output,
  signal,
} from '@angular/core';
import * as d3 from 'd3';

export interface BarSeries {
  key: string;
  label: string;
  /** 1-6, mapped to --chart-series-N via a CSS class. */
  seriesIndex: number;
  /**
   * A signed series is NOT stacked: it is drawn as its own hatched bar beside the stack in each
   * bucket, from a zero baseline, so a negative value goes below zero instead of quietly
   * shrinking the stacked total. Vertical charts only.
   */
  signed?: boolean;
}

/** Share of a bucket's band the stack keeps when the chart also has signed bars beside it. */
const STACK_SHARE = 0.62;
/** Gap between the stack and the signed bars, as a share of the band. */
const SIGNED_GAP = 0.06;
/**
 * A signed bar is drawn at most this many times the largest stack, either way. Past that it is
 * clipped and marked with a break, so one huge correction cannot squash every other bar flat.
 */
const SIGNED_CLAMP_RATIO = 2;

let hatchCounter = 0;

export interface BarDatum {
  /** Short axis label. */
  label: string;
  /** Full label for tooltips and the accessible table. */
  fullLabel: string;
  values: Record<string, number>;
  /**
   * Optional per-datum fill — a hex color or a `url(#…)` reference from
   * filament-svg-defs. When absent the mark takes its series' theme class, which is the
   * default and the right choice for anything that must stay readable at a glance.
   */
  fill?: string;
  filter?: string | null;
  fillOpacity?: number;
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
  fill: string | null;
  filter: string | null;
  fillOpacity: number;
  signed: boolean;
  /** Drawn shorter than its value (see SIGNED_CLAMP_RATIO); the tooltip keeps the real one. */
  clipped: boolean;
  /** Path of the break mark across a clipped bar's far end, or null. */
  breakPath: string | null;
}

interface BucketHitbox {
  datum: BarDatum;
  x: number;
  y: number;
  w: number;
  h: number;
  crosshairX: number;
}

interface ChartTooltip {
  title: string;
  lines: {
    key: string;
    label: string;
    value: number;
    seriesIndex: number;
    signed: boolean;
    /** The mark is swatch-filled, so a series color key would name the wrong color. */
    swatch: boolean;
  }[];
  x: number;
  y: number;
  crosshairX: number;
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
  readonly series = input<readonly BarSeries[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly orientation = input<'auto' | 'vertical' | 'horizontal'>('auto');
  /**
   * Signed bars are clipped past SIGNED_CLAMP_RATIO times the largest stack, but never below this
   * value, so a quiet week with a tiny stack does not clip an ordinary correction.
   */
  readonly signedLimitFloor = input(0);

  readonly barSelect = output<{ label: string; seriesKey: string | null }>();

  readonly resolvedOrientation = computed<'vertical' | 'horizontal'>(() => {
    const explicit = this.orientation();
    if (explicit !== 'auto') return explicit;
    return 'vertical';
  });

  /**
   * The left gutter holds numeric value ticks when the bars are vertical, but the CATEGORY
   * labels when they are horizontal — and a printer name does not fit in 44px, so it was
   * being clipped. Widened to the longest label in horizontal mode, and capped so a long
   * name cannot squeeze the plot itself out of existence.
   */
  private readonly margin = computed(() => {
    const base = { top: 8, right: 12, bottom: 28, left: 44 };
    if (this.resolvedOrientation() !== 'horizontal') return base;

    const longest = this.data().reduce(
      (max, datum) => Math.max(max, (datum.label ?? '').length),
      0
    );
    // ~6.5px per character at the 10px axis font, plus padding off the edge.
    const needed = Math.round(longest * 6.5) + 12;
    return { ...base, left: Math.min(180, Math.max(base.left, needed)) };
  });
  readonly tooltip = signal<ChartTooltip | null>(null);

  /** Unique per instance: two charts on one page must not resolve each other's pattern. */
  readonly hatchId = `bar-hatch-${++hatchCounter}`;

  private readonly stackSeries = computed(() =>
    this.series().filter((item) => !item.signed)
  );
  readonly signedSeries = computed(() =>
    this.resolvedOrientation() === 'vertical'
      ? this.series().filter((item) => item.signed)
      : []
  );

  constructor() {
    effect(() => {
      if (
        isDevMode() &&
        this.resolvedOrientation() === 'horizontal' &&
        this.series().some((item) => item.signed)
      ) {
        console.warn(
          'app-bar-chart: a signed series is only drawn on a vertical chart; it is ignored here.'
        );
      }
    });
  }

  private readonly stackMax = computed(
    () =>
      d3.max(this.data(), (datum) =>
        d3.sum(this.stackSeries(), (item) =>
          Math.max(0, datum.values[item.key] ?? 0)
        )
      ) ?? 0
  );

  /** How far a signed bar may reach either way. Unlimited when there is no stack to dwarf. */
  private readonly signedLimit = computed(() => {
    const stack = this.stackMax();
    if (stack <= 0) return Infinity;
    return Math.max(stack * SIGNED_CLAMP_RATIO, this.signedLimitFloor());
  });

  private drawnSigned(value: number): number {
    const limit = this.signedLimit();
    return Math.max(-limit, Math.min(limit, value));
  }

  private readonly maxValue = computed(() =>
    Math.max(
      this.stackMax(),
      d3.max(this.data(), (datum) =>
        d3.max(this.signedSeries(), (item) =>
          this.drawnSigned(datum.values[item.key] ?? 0)
        )
      ) ?? 0
    )
  );

  /** Only a signed series can take the axis below zero. */
  private readonly minValue = computed(() =>
    Math.min(
      0,
      d3.min(this.data(), (datum) =>
        d3.min(this.signedSeries(), (item) =>
          this.drawnSigned(datum.values[item.key] ?? 0)
        )
      ) ?? 0
    )
  );

  private readonly valueDomain = computed<[number, number]>(() => {
    const max = this.maxValue();
    const min = this.minValue();
    // A degenerate [0, 0] domain would put every bar at NaN.
    return [min, max > 0 || min < 0 ? max : 1];
  });

  private readonly innerSize = computed(() => ({
    w: Math.max(0, this.width() - this.margin().left - this.margin().right),
    h: Math.max(0, this.height() - this.margin().top - this.margin().bottom),
  }));

  /** Pixel y of the zero value on a vertical chart. */
  readonly zeroY = computed(() => {
    const scale = d3
      .scaleLinear()
      .domain(this.valueDomain())
      .range([this.innerSize().h, 0]);
    return this.margin().top + scale(0);
  });

  /** Drawn only when something is negative; otherwise the x axis already sits at zero. */
  readonly zeroLine = computed(() => {
    if (
      this.minValue() >= 0 ||
      this.resolvedOrientation() !== 'vertical' ||
      this.width() <= 0 ||
      this.height() <= 0
    )
      return null;
    return {
      x1: this.margin().left,
      x2: this.margin().left + this.innerSize().w,
      y: this.zeroY(),
    };
  });

  readonly valueTicks = computed(() => {
    if (
      this.resolvedOrientation() !== 'vertical' ||
      this.width() <= 0 ||
      this.height() <= 0
    )
      return [];

    const { w: innerW, h: innerH } = this.innerSize();
    const scale = d3
      .scaleLinear()
      .domain(this.valueDomain())
      .range([innerH, 0]);

    return scale.ticks(4).map((value) => ({
      value,
      y: this.margin().top + scale(value),
      x1: this.margin().left,
      x2: this.margin().left + innerW,
    }));
  });

  readonly bucketHitboxes = computed<BucketHitbox[]>(() => {
    if (
      this.resolvedOrientation() !== 'vertical' ||
      this.width() <= 0 ||
      this.height() <= 0 ||
      this.data().length === 0
    )
      return [];

    const innerW = Math.max(
      0,
      this.width() - this.margin().left - this.margin().right
    );
    const innerH = Math.max(
      0,
      this.height() - this.margin().top - this.margin().bottom
    );
    const band = d3
      .scaleBand<string>()
      .domain(this.data().map((datum) => datum.fullLabel))
      .range([0, innerW])
      .padding(0.2);

    return this.data().map((datum) => {
      const x = this.margin().left + (band(datum.fullLabel) ?? 0);
      return {
        datum,
        x,
        y: this.margin().top,
        w: band.bandwidth(),
        h: innerH,
        crosshairX: x + band.bandwidth() / 2,
      };
    });
  });

  readonly segments = computed<Segment[]>(() => {
    const data = this.data();
    const series = this.series();
    const w = this.width();
    const h = this.height();

    // Never draw before the container has been measured; scales would be degenerate.
    if (w <= 0 || h <= 0 || data.length === 0 || series.length === 0) return [];

    const { w: innerW, h: innerH } = this.innerSize();
    const max = this.maxValue();
    const total = max === 0 ? 1 : max;
    const stack = this.stackSeries();
    const signed = this.signedSeries();

    const out: Segment[] = [];

    if (this.resolvedOrientation() === 'vertical') {
      const band = d3
        .scaleBand<string>()
        .domain(data.map((d) => d.fullLabel))
        .range([0, innerW])
        .padding(0.2);
      const value = d3
        .scaleLinear()
        .domain(this.valueDomain())
        .range([innerH, 0]);
      const bw = band.bandwidth();
      const stackW = signed.length > 0 ? bw * STACK_SHARE : bw;
      const signedW =
        signed.length > 0
          ? (bw * (1 - STACK_SHARE - SIGNED_GAP)) / signed.length
          : 0;

      for (const d of data) {
        const bandX = this.margin().left + (band(d.fullLabel) ?? 0);
        let cursor = 0;
        for (const s of stack) {
          const v = d.values[s.key] ?? 0;
          if (v <= 0) continue;
          const y0 = value(cursor);
          const y1 = value(cursor + v);
          out.push({
            x: bandX,
            y: this.margin().top + y1,
            w: stackW,
            h: Math.max(1, y0 - y1),
            seriesIndex: s.seriesIndex,
            seriesKey: s.key,
            label: d.label,
            tooltip: `${d.fullLabel} — ${s.label}: ${v}`,
            fill: d.fill ?? null,
            filter: d.filter ?? null,
            fillOpacity: d.fillOpacity ?? 1,
            signed: false,
            clipped: false,
            breakPath: null,
          });
          cursor += v;
        }

        signed.forEach((s, index) => {
          const v = d.values[s.key] ?? 0;
          if (v === 0) return;
          const drawn = this.drawnSigned(v);
          const clipped = drawn !== v;
          const top = value(Math.max(0, drawn));
          const bottom = value(Math.min(0, drawn));
          const x = bandX + stackW + bw * SIGNED_GAP + index * signedW;
          const y = this.margin().top + top;
          const h = Math.max(1, bottom - top);
          out.push({
            x,
            y,
            w: signedW,
            h,
            seriesIndex: s.seriesIndex,
            seriesKey: s.key,
            label: d.label,
            tooltip: `${d.fullLabel} — ${s.label}: ${v}${clipped ? ' (bar shortened to fit)' : ''}`,
            clipped,
            breakPath: clipped
              ? this.breakPath(x, signedW, drawn > 0 ? y + 12 : y + h - 18)
              : null,
            // Hatched, never swatch-filled: it must not read as one more stacked series.
            fill: `url(#${this.hatchId})`,
            filter: null,
            fillOpacity: 1,
            signed: true,
          });
        });
      }
    } else {
      const band = d3
        .scaleBand<string>()
        .domain(data.map((d) => d.fullLabel))
        .range([0, innerH])
        .padding(0.2);
      const value = d3.scaleLinear().domain([0, total]).range([0, innerW]);

      for (const d of data) {
        let cursor = 0;
        for (const s of stack) {
          const v = d.values[s.key] ?? 0;
          if (v <= 0) continue;
          out.push({
            x: this.margin().left + value(cursor),
            y: this.margin().top + (band(d.fullLabel) ?? 0),
            w: Math.max(1, value(v)),
            h: band.bandwidth(),
            seriesIndex: s.seriesIndex,
            seriesKey: s.key,
            label: d.label,
            tooltip: `${d.fullLabel} — ${s.label}: ${v}`,
            fill: d.fill ?? null,
            filter: d.filter ?? null,
            fillOpacity: d.fillOpacity ?? 1,
            signed: false,
            clipped: false,
            breakPath: null,
          });
          cursor += v;
        }
      }
    }

    return out;
  });

  /** Two slanted strokes across a bar, the usual "axis break" mark. */
  private breakPath(x: number, w: number, y: number): string {
    const rise = Math.min(5, w / 2.5);
    return [0, 6]
      .map(
        (offset) =>
          `M${x - 3},${y + offset + rise} L${x + w + 3},${y + offset - rise}`
      )
      .join(' ');
  }

  readonly axisLabels = computed(() => {
    const data = this.data();
    const w = this.width();
    const h = this.height();
    if (w <= 0 || h <= 0 || data.length === 0) return [];

    const innerW = Math.max(0, w - this.margin().left - this.margin().right);
    const innerH = Math.max(0, h - this.margin().top - this.margin().bottom);
    const vertical = this.resolvedOrientation() === 'vertical';

    const band = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.fullLabel))
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
        key: d.fullLabel,
        text: d.label,
        x: vertical
          ? this.margin().left + (band(d.fullLabel) ?? 0) + band.bandwidth() / 2
          : this.margin().left - 6,
        y: vertical
          ? this.margin().top + innerH + 18
          : this.margin().top +
            (band(d.fullLabel) ?? 0) +
            band.bandwidth() / 2 +
            4,
        anchor: vertical ? 'middle' : 'end',
      }));
  });

  onSelect(segment: Segment): void {
    this.barSelect.emit({ label: segment.label, seriesKey: segment.seriesKey });
  }

  showBucketTooltip(bucket: BucketHitbox): void {
    this.tooltip.set({
      title: bucket.datum.fullLabel,
      lines: [...this.stackSeries(), ...this.signedSeries()]
        .map((item) => ({
          key: item.key,
          label: item.label,
          value: bucket.datum.values[item.key] ?? 0,
          seriesIndex: item.seriesIndex,
          signed: item.signed === true,
          swatch: !item.signed && !!bucket.datum.fill,
        }))
        // A signed value is worth listing whenever it is nonzero, negative included.
        .filter((line) => (line.signed ? line.value !== 0 : line.value > 0)),
      x: bucket.crosshairX,
      y: this.margin().top,
      crosshairX: bucket.crosshairX,
    });
  }

  showSegmentTooltip(segment: Segment): void {
    const datum = this.data().find((item) => item.label === segment.label);
    const series = this.series().find((item) => item.key === segment.seriesKey);
    this.tooltip.set({
      title: datum?.fullLabel ?? segment.label,
      lines: [
        {
          key: segment.seriesKey,
          label: series?.label ?? segment.seriesKey,
          value: datum?.values[segment.seriesKey] ?? 0,
          seriesIndex: segment.seriesIndex,
          signed: segment.signed,
          swatch: !segment.signed && segment.fill !== null,
        },
      ],
      x: segment.x + segment.w / 2,
      y: Math.max(this.margin().top, segment.y),
      crosshairX: segment.x + segment.w / 2,
    });
  }

  hideTooltip(): void {
    this.tooltip.set(null);
  }
}
