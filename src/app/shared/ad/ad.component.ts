import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { SubscriptionService } from '../../core/services/subscription.service';
import { IS_CORDOVA_IOS } from '../../core/utils/platform';

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
  imports: [AdsenseModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  readonly adSlot = input<number | null>(null);
  readonly fullWidthResponsive = input<boolean>(true);
  /**
   * Never in the iOS app: AdSense inside an app's webview falls under Google's app policies,
   * and tracking ads there would need Apple's App Tracking Transparency prompt (#366).
   * AdsenseLoaderService keeps the script itself out of the app too.
   */
  private readonly isCordovaIos = inject(IS_CORDOVA_IOS);
  readonly showAd = computed(
    () => !this.isCordovaIos && !this.subscriptionService.isPro()
  );
}
