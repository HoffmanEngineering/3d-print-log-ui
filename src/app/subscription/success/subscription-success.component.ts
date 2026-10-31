import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LoggingService } from '../../core/services/logging.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-subscription-success',
  templateUrl: './subscription-success.component.html',
  styleUrl: './subscription-success.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, MatCardContent, MatButton, RouterLink],
})
export class SubscriptionSuccessComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loggingService = inject(LoggingService);

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
    this.loggingService.logEvent('SubscriptionSuccess_Activated');
  }
}
