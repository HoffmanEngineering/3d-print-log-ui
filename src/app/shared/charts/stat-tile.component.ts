import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Metric, MoneyMetric } from 'src/app/analytics/models/analytics.models';
import { formatCoverageNote } from './coverage-note';
import { formatDurationShort, formatMoney } from './format-metric';

export type StatFormat = 'number' | 'percent' | 'grams' | 'duration' | 'money';

@Component({
  selector: 'app-stat-tile',
  imports: [MatCardModule, MatIconModule, MatTooltipModule, DecimalPipe],
  templateUrl: './stat-tile.component.html',
  styleUrls: ['./stat-tile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly metric = input<Metric | MoneyMetric | null>(null);
  readonly format = input<StatFormat>('number');
  readonly loading = input(false);

  readonly display = computed(() => {
    const value = this.metric()?.value ?? null;
    return value === null ? '—' : this.formatValue(value);
  });

  /**
   * Percent change vs the previous window. Null when no comparison was requested or the
   * prior value was 0 — "+∞%" is not a useful thing to show anyone.
   */
  readonly delta = computed(() => {
    const m = this.metric();
    if (!m || m.value === null || m.previous === null || m.previous === 0)
      return null;

    const change = ((m.value - m.previous) / Math.abs(m.previous)) * 100;
    return {
      percent: Math.abs(change),
      direction: change >= 0 ? 'up' : 'down',
    } as const;
  });

  readonly coverageNote = computed(() =>
    formatCoverageNote(this.metric()?.coverage)
  );

  private formatValue(value: number): string {
    switch (this.format()) {
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'grams':
        return value >= 1000
          ? `${(value / 1000).toFixed(1)} kg`
          : `${Math.round(value)} g`;
      case 'duration':
        return formatDurationShort(value);
      case 'money':
        return formatMoney(value, (this.metric() as MoneyMetric)?.currency);
      default:
        return new Intl.NumberFormat().format(Math.round(value));
    }
  }
}
