import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-subscription-canceled',
  templateUrl: './subscription-canceled.component.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionCanceledComponent {}
