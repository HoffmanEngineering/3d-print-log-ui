const DEV_ANONYMOUS_KEY = 'devAnonymous';

/**
 * Dev-only: reports whether the current session should be treated as an
 * unauthenticated visitor. Activated by visiting any URL with
 * `?devUserId=anonymous`; the decision is persisted to sessionStorage for the
 * tab so it survives in-app navigations that drop the query param.
 *
 * Only consulted when `environment.devAuthBypass` is true, so it never affects
 * production, auth0-dev, or unittest builds.
 */
export function isDevAnonymous(search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.get('devUserId') === 'anonymous') {
    try {
      sessionStorage.setItem(DEV_ANONYMOUS_KEY, 'true');
    } catch {
      // sessionStorage unavailable (e.g. prerender) — fall through.
    }
    return true;
  }
  try {
    return sessionStorage.getItem(DEV_ANONYMOUS_KEY) === 'true';
  } catch {
    return false;
  }
}
