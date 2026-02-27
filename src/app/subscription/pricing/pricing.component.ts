import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LoggingService } from '../../core/services/logging.service';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loggingService = inject(LoggingService);

  readonly isPro = this.subscriptionService.isPro;
  readonly plan = this.subscriptionService.plan;

  checkoutLoading = false;

  checkout(planId: string): void {
    if (this.checkoutLoading) return;
    this.checkoutLoading = true;

    this.loggingService.logEvent('Pricing_CheckoutClicked', { planId });

    this.subscriptionService.createCheckoutSession(planId).subscribe({
      next: (result) => {
        window.location.href = result.url;
      },
      error: () => {
        this.checkoutLoading = false;
      },
    });
  }
}
