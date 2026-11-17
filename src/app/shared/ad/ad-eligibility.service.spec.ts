import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { AdEligibilityService } from './ad-eligibility.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { IS_CORDOVA_IOS } from '../../core/utils/platform';

describe('AdEligibilityService', () => {
  let isLoggedIn: WritableSignal<boolean | null>;
  let loaded: WritableSignal<boolean>;
  let isPro: WritableSignal<boolean>;

  const create = (isCordovaIos = false) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn } },
        { provide: SubscriptionService, useValue: { loaded, isPro } },
        { provide: IS_CORDOVA_IOS, useValue: isCordovaIos },
      ],
    });
    return TestBed.inject(AdEligibilityService);
  };

  beforeEach(() => {
    isLoggedIn = signal(null);
    loaded = signal(false);
    isPro = signal(false);
  });

  it('shows nothing until the login status is known', () => {
    expect(create().canShowAds()).toBe(false);
  });

  it('shows ads to a signed-out visitor', () => {
    isLoggedIn.set(false);
    expect(create().canShowAds()).toBe(true);
  });

  // The Pro flash: isPro is false until /me answers, so a signed-in user waits for it.
  it('shows nothing to a signed-in user until the subscription loads', () => {
    isLoggedIn.set(true);
    const service = create();
    expect(service.canShowAds()).toBe(false);

    loaded.set(true);
    expect(service.canShowAds()).toBe(true);
  });

  it('never shows ads to a Pro user', () => {
    isLoggedIn.set(true);
    loaded.set(true);
    isPro.set(true);
    expect(create().canShowAds()).toBe(false);
  });

  it('never shows ads in the iOS app', () => {
    isLoggedIn.set(false);
    expect(create(true).canShowAds()).toBe(false);
  });
});
