import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { IS_CORDOVA_IOS } from '../../core/utils/platform';

/**
 * Whether this visitor gets ads. Every "maybe" is a no, so nothing is pushed and then torn
 * down: a Pro user's ad used to render (and push) while /me was still in flight.
 */
@Injectable({ providedIn: 'root' })
export class AdEligibilityService {
  private readonly auth = inject(AuthService);
  private readonly subscription = inject(SubscriptionService);
  /**
   * Never in the iOS app: AdSense inside an app's webview falls under Google's app policies,
   * and tracking ads there would need Apple's App Tracking Transparency prompt (#366).
   * AdsenseLoaderService keeps the script itself out of the app too.
   */
  private readonly isCordovaIos = inject(IS_CORDOVA_IOS);

  readonly canShowAds = computed(() => {
    if (this.isCordovaIos) return false;
    const loggedIn = this.auth.isLoggedIn();
    // Unknown (still starting up, or prerendering): wait.
    if (loggedIn === null) return false;
    // A signed-out visitor can't be Pro.
    if (!loggedIn) return true;
    return this.subscription.loaded() && !this.subscription.isPro();
  });
}
