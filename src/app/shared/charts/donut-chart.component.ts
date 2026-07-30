import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import * as d3 from 'd3';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** 1-6, mapped to --chart-series-N via a CSS class. */
  seriesIndex: number;
}

interface RenderedSlice {
  key: string;
  path: string;
  seriesIndex: number;
  tooltip: string;
}

@Component({
  selector: 'app-donut-chart',
  imports: [DecimalPipe],
  templateUrl: './donut-chart.component.html',
  styleUrls: ['./donut-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChartComponent {
  readonly slices = input<DonutSlice[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly centerLabel = input('');
  readonly centerValue = input('');

  readonly sliceSelect = output<{ key: string }>();

  readonly total = computed(() => d3.sum(this.slices(), (s) => s.value));

  readonly radius = computed(() =>
    Math.max(0, Math.min(this.width(), this.height()) / 2 - 8)
  );

  readonly rendered = computed<RenderedSlice[]>(() => {
    const total = this.total();
    if (this.width() <= 0 || this.height() <= 0 || total <= 0) return [];

    const outer = this.radius();
    const arc = d3
      .arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(outer * 0.62)
      .outerRadius(outer);

    // Zero-valued slices are dropped from the ring but kept in the legend.
    const positive = this.slices().filter((s) => s.value > 0);

    const pie = d3
      .pie<DonutSlice>()
      .sort(null)
      .value((s) => s.value);

    return pie(positive).map((datum) => ({
      key: datum.data.key,
      path: arc(datum) ?? '',
      seriesIndex: datum.data.seriesIndex,
      tooltip: `${datum.data.label}: ${datum.data.value} (${(
        (datum.data.value / total) *
        100
      ).toFixed(1)}%)`,
    }));
  });

  readonly center = computed(() => ({
    x: this.width() / 2,
    y: this.height() / 2,
  }));

  percent(slice: DonutSlice): number {
    const total = this.total();
    return total <= 0 ? 0 : (slice.value / total) * 100;
  }

  onSelect(key: string): void {
    this.sliceSelect.emit({ key });
  }
}
