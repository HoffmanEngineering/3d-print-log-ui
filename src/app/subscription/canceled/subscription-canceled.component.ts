import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { CAN_PURCHASE_PRO } from 'src/app/core/pricing/pro-purchase';

@Component({
  selector: 'app-subscription-canceled',
  templateUrl: './subscription-canceled.component.html',
  styleUrl: './subscription-canceled.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, MatCardContent, MatButton, RouterLink],
})
export class SubscriptionCanceledComponent {
  /** False in the iOS app, where Pro is never sold (#366). */
  readonly canPurchasePro = inject(CAN_PURCHASE_PRO);
}
