/**
 * The user agent the Cordova app pins via config.xml's OverrideUserAgent. Kept as a named
 * constant so the app repo's CI guard can assert the two still match — a silent drift here
 * disables every Cordova-only code path with no error anywhere.
 */
export const CORDOVA_USER_AGENT = 'Mozilla/5.0 Google PrintLog/1.2';

/**
 * Evaluated per call rather than once at import, so tests can exercise both branches.
 * The constant below keeps the original import-time semantics for existing callers.
 */
export function isCordovaPlatform(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.userAgent === CORDOVA_USER_AGENT
  );
}

export const isCordova = isCordovaPlatform();
