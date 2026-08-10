const DEV_USER_ID_KEY = 'devUserId';
const DEFAULT_DEV_USER_ID = '1';

/**
 * Dev-only: resolves the user the app should act as. Set it by visiting any URL
 * with `?devUserId=2` (or `?devUserId=anonymous` to simulate a logged-out
 * visitor); the value is persisted to sessionStorage for the tab so it survives
 * in-app navigations that drop the query param.
 *
 * Visiting with a different `devUserId` switches users; `?devUserId=` (empty)
 * clears the override and falls back to user 1.
 *
 * Only consulted when `environment.devAuthBypass` is true, so it never affects
 * production, auth0-dev, or unittest builds.
 */
export function resolveDevUserId(search: string): string {
  const param = new URLSearchParams(search).get('devUserId');

  if (param !== null) {
    try {
      if (param === '') {
        sessionStorage.removeItem(DEV_USER_ID_KEY);
      } else {
        sessionStorage.setItem(DEV_USER_ID_KEY, param);
      }
    } catch {
      // sessionStorage unavailable (e.g. prerender) — fall through.
    }
    return param === '' ? DEFAULT_DEV_USER_ID : param;
  }

  try {
    return sessionStorage.getItem(DEV_USER_ID_KEY) ?? DEFAULT_DEV_USER_ID;
  } catch {
    return DEFAULT_DEV_USER_ID;
  }
}

/**
 * Dev-only: reports whether the current session should be treated as an
 * unauthenticated visitor. See {@link resolveDevUserId}.
 */
export function isDevAnonymous(search: string): boolean {
  return resolveDevUserId(search) === 'anonymous';
}
