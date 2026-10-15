import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultFlexDirective,
  DefaultLayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

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
export class SubscriptionCanceledComponent {}
