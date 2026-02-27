import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  adSlot = input<number | null>(null);
  fullWidthResponsive = input<boolean>(true);
  readonly isPro = this.subscriptionService.isPro;
}
