import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultFlexDirective,
  DefaultLayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { CAN_PURCHASE_PRO } from 'src/app/core/pricing/pro-purchase';

@Component({
  selector: 'app-subscription-canceled',
  templateUrl: './subscription-canceled.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    MatCard,
    DefaultFlexDirective,
    MatCardContent,
    DefaultLayoutGapDirective,
    MatButton,
    RouterLink,
  ],
})
export class SubscriptionCanceledComponent {
  /** False in the iOS app, where Pro is never sold (#366). */
  readonly canPurchasePro = inject(CAN_PURCHASE_PRO);
}
