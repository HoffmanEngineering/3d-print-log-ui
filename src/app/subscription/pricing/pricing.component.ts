import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LoggingService } from '../../core/services/logging.service';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loggingService = inject(LoggingService);

  readonly isPro = this.subscriptionService.isPro;
  readonly plan = this.subscriptionService.plan;

  checkoutLoadingPlan: string | null = null;

  ngOnInit(): void {
    this.loggingService.logEvent('Pricing_PageViewed');
  }

  checkout(planId: string): void {
    if (this.checkoutLoadingPlan !== null) return;
    this.checkoutLoadingPlan = planId;

    this.loggingService.logEvent('Pricing_CheckoutClicked', { planId });

    this.subscriptionService.createCheckoutSession(planId).subscribe({
      next: (result) => {
        window.location.href = result.url;
      },
      error: () => {
        this.checkoutLoadingPlan = null;
      },
    });
  }
}
