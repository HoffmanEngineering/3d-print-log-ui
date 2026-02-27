import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-subscription-success',
  templateUrl: './subscription-success.component.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSuccessComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
  }
}
