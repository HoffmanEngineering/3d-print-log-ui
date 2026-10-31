import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LoggingService } from '../../core/services/logging.service';
import { CAN_PURCHASE_PRO } from '../../core/pricing/pro-purchase';
import {
  annualPricePerMonth,
  annualSavingsPercent,
  proPlan,
} from '../../core/pricing/pro-pricing';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
  MatCardActions,
  MatCardSubtitle,
} from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardContent,
    RouterLink,
    MatCardHeader,
    MatCardTitle,
    MatCardActions,
    MatButton,
    MatCardSubtitle,
  ],
})
export class PricingComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loggingService = inject(LoggingService);

  /** False in the iOS app: no prices, no Subscribe buttons, no billing pointer (#366). */
  readonly canPurchasePro = inject(CAN_PURCHASE_PRO);

  readonly isPro = this.subscriptionService.isPro;
  readonly plan = this.subscriptionService.plan;

  /** Prices come from src/content/pro-pricing.json, never typed into the template. */
  readonly monthly = proPlan('pro_monthly');
  readonly annual = proPlan('pro_annual');
  readonly annualPerMonth = annualPricePerMonth();
  readonly annualSavingsPercent = annualSavingsPercent();

  /**
   * A signal rather than a plain field because this component is OnPush and the
   * only writer that has to repaint - the checkout error handler - runs in an
   * HTTP callback with no template event behind it. As a plain field the
   * failure path set the value and nothing re-rendered, so a failed checkout
   * left both Subscribe buttons disabled and spinning until the user reloaded.
   */
  readonly checkoutLoadingPlan = signal<string | null>(null);

  ngOnInit(): void {
    this.loggingService.logEvent('Pricing_PageViewed');
  }

  checkout(planId: string): void {
    if (this.checkoutLoadingPlan() !== null) return;
    this.checkoutLoadingPlan.set(planId);

    this.loggingService.logEvent('Pricing_CheckoutClicked', { planId });

    this.subscriptionService.createCheckoutSession(planId).subscribe({
      next: (result) => {
        window.location.href = result.url;
      },
      error: () => {
        this.checkoutLoadingPlan.set(null);
      },
    });
  }
}
