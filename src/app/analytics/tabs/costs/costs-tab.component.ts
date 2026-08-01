import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BarChartComponent,
  BarDatum,
  BarSeries,
} from 'src/app/shared/charts/bar-chart.component';
import {
  formatTickDate,
  parseLocalDate,
} from 'src/app/shared/charts/chart-axis';
import { ChartFrameComponent } from 'src/app/shared/charts/chart-frame.component';
import { StatTileComponent } from 'src/app/shared/charts/stat-tile.component';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { CostsResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { createTabData } from '../tab-data';

export interface SetupAction {
  reason: string;
  message: string;
  link: string;
  linkText: string;
}

/**
 * Each missing input gets its OWN call to action. A generic "some costs are missing" leaves the
 * user with nothing to do, which is the difference spec §16 draws between a tab that looks
 * broken and one that is empty for a reason they can fix.
 */
const SETUP_ACTIONS: Record<string, Omit<SetupAction, 'reason'>> = {
  PriceMissing: {
    message:
      'Some spools have no purchase price, so their filament cost is unknown.',
    link: '/filaments',
    linkText: 'Add spool prices',
  },
  WattageMissing: {
    message:
      'Some printers have no wattage set, so their electricity cost is unknown.',
    link: '/printers',
    linkText: 'Set printer wattage',
  },
  RateMissing: {
    message:
      'Your electricity rate is not set, so no electricity cost can be calculated.',
    link: '/settings',
    linkText: 'Set your electricity rate',
  },
  CurrencyMismatch: {
    message:
      'Some spools are priced in a different currency and were left out.',
    link: '/filaments',
    linkText: 'Review spool currencies',
  },
};

@Component({
  selector: 'app-costs-tab',
  imports: [
    BarChartComponent,
    ChartFrameComponent,
    DecimalPipe,
    RouterLink,
    StatTileComponent,
  ],
  templateUrl: './costs-tab.component.html',
  styleUrls: ['./costs-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostsTabComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(AnalyticsFilterStore);

  private readonly tab = createTabData<CostsResponse>(
    this.store.filter,
    (filter) => this.analytics.getCosts(filter),
    (response) => response.totalSpend.value === null
  );

  readonly data = this.tab.data;
  readonly state = this.tab.state;

  /** Fixed indices so a component keeps its colour in every chart on the tab. */
  readonly componentSeries: readonly BarSeries[] = [
    { key: 'filament', label: 'Filament', seriesIndex: 1 },
    { key: 'electricity', label: 'Electricity', seriesIndex: 2 },
    { key: 'maintenance', label: 'Maintenance', seriesIndex: 3 },
  ];

  readonly singleSeries: readonly BarSeries[] = [
    { key: 'value', label: 'Prints', seriesIndex: 1 },
  ];

  readonly spendData = computed<BarDatum[]>(() => {
    const response = this.data();
    if (!response) return [];

    return [...response.spendOverTime]
      .sort(
        (left, right) =>
          left.localStart.localeCompare(right.localStart) ||
          left.index - right.index
      )
      .map((bucket) => {
        const date = parseLocalDate(bucket.localStart);
        return {
          label: formatTickDate(date, response.granularity, true),
          fullLabel: formatTickDate(date, response.granularity, false),
          values: {
            filament: bucket.filament ?? 0,
            electricity: bucket.electricity ?? 0,
            maintenance: bucket.maintenance ?? 0,
          },
        };
      });
  });

  readonly distributionData = computed<BarDatum[]>(() =>
    (this.data()?.costPerPrint ?? []).map((bucket) => ({
      label: bucket.label,
      fullLabel: bucket.label,
      values: { value: bucket.count },
    }))
  );

  readonly byMaterialData = computed<BarDatum[]>(() =>
    (this.data()?.byMaterialType ?? []).map((group) => ({
      label: group.label,
      fullLabel: `${group.label} — ${group.amount}`,
      values: { value: group.amount },
    }))
  );

  readonly setupActions = computed<SetupAction[]>(() =>
    (this.data()?.coverage.exclusions ?? [])
      .filter((exclusion) => exclusion.reason in SETUP_ACTIONS)
      .map((exclusion) => ({
        reason: exclusion.reason,
        ...SETUP_ACTIONS[exclusion.reason],
      }))
  );

  readonly failureShareText = computed(() => {
    const share = this.data()?.costOfFailureSharePercent;
    return share === null || share === undefined
      ? null
      : `${share.toFixed(1)}% of spend went on failed or cancelled prints`;
  });

  onRetry(): void {
    this.tab.retry();
  }
}
