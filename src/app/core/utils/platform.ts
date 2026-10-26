import { InjectionToken } from '@angular/core';

/**
 * The user agent the Android app pins via config.xml's OverrideUserAgent. Kept as a named
 * constant so the app repo's CI guard can assert the two still match — a silent drift here
 * disables every Cordova-only code path with no error anywhere.
 */
export const CORDOVA_USER_AGENT = 'Mozilla/5.0 Google PrintLog/1.2';

/**
 * The user agent the iOS app pins, in config.xml's `<platform name="ios">` block. Separate
 * from Android's because App Store rules force iOS-only behavior (no Stripe checkout, a
 * different NFC flow) and WKWebView treats file inputs differently. The same CI guard checks
 * it, so it carries the same drift risk.
 */
export const CORDOVA_IOS_USER_AGENT = 'Mozilla/5.0 Google PrintLog-iOS/1.0';

function userAgentIs(expected: string): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === expected;
}

/**
 * Either app shell. Evaluated per call rather than once at import, so tests can exercise
 * both branches. The constants below keep the original import-time semantics for existing
 * callers.
 */
export function isCordovaPlatform(): boolean {
  return isCordovaAndroidPlatform() || isCordovaIosPlatform();
}

export function isCordovaAndroidPlatform(): boolean {
  return userAgentIs(CORDOVA_USER_AGENT);
}

export function isCordovaIosPlatform(): boolean {
  return userAgentIs(CORDOVA_IOS_USER_AGENT);
}

export const isCordova = isCordovaPlatform();
export const isCordovaAndroid = isCordovaAndroidPlatform();
export const isCordovaIos = isCordovaIosPlatform();

/** Whether this is either app shell, as an injectable value so specs can override it. */
export const IS_CORDOVA = new InjectionToken<boolean>('IS_CORDOVA', {
  providedIn: 'root',
  factory: () => isCordovaPlatform(),
});

/** Whether this is the iOS app shell, as an injectable value so specs can override it. */
export const IS_CORDOVA_IOS = new InjectionToken<boolean>('IS_CORDOVA_IOS', {
  providedIn: 'root',
  factory: () => isCordovaIosPlatform(),
});
