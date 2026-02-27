import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-pro-subscription',
  templateUrl: './docs-pro-subscription.component.html',
  styleUrls: ['./docs-pro-subscription.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsProSubscriptionComponent {}
