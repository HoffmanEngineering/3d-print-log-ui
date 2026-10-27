import { inject, InjectionToken } from '@angular/core';
import { IS_CORDOVA_IOS } from '../utils/platform';

/**
 * Whether this surface may sell Pro: show prices, Subscribe buttons, "Upgrade to Pro" calls
 * to action, the Stripe billing portal, or ask for tips. False in the iOS app, because App
 * Store guideline 3.1.1 rejects an app that sells digital subscriptions or takes tips through
 * anything but Apple's in-app purchase, or points users at another way to pay (#366).
 *
 * Pro bought on the web still works in the app; it just is never sold there. Every call to
 * action reads this one token, and SubscriptionService refuses to open a Stripe session when
 * it is false, so a call to action that slips through still cannot reach Stripe.
 */
export const CAN_PURCHASE_PRO = new InjectionToken<boolean>(
  'CAN_PURCHASE_PRO',
  {
    providedIn: 'root',
    factory: () => !inject(IS_CORDOVA_IOS),
  }
);
