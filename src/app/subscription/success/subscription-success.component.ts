import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LoggingService } from '../../core/services/logging.service';

@Component({
  selector: 'app-subscription-success',
  templateUrl: './subscription-success.component.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSuccessComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loggingService = inject(LoggingService);

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
    this.loggingService.logEvent('SubscriptionSuccess_Activated');
  }
}
