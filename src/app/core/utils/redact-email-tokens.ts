/** The URL-bearing fields Application Insights puts on page views, dependencies and requests. */
const URL_FIELDS = ['uri', 'refUri', 'name', 'target', 'url'] as const;

/** Query parameters that carry an email token on the email endpoints. */
const TOKEN_PARAMS = /([?&](?:t|u|m)=)[^&#\s]*/g;

/** Paths whose URLs can carry a token: the public preferences page and the API's email endpoints. */
const EMAIL_PATH = /\/email-preferences|\/api\/email\//;

/**
 * Application Insights telemetry initializer that keeps email tokens out of telemetry.
 *
 * Unsubscribe and manage tokens arrive in the `/email-preferences` URL fragment and go to the
 * API in the `X-Email-Token` header. The page strips the fragment as soon as it loads, but the
 * SDK records the initial page view during `loadAppInsights()`, so this must be registered
 * before that call. Query-string tokens are redacted too, in case a link or a dependency
 * ever carries one. URLs outside the email paths are left alone.
 */
export function redactEmailTokens(item: {
  baseData?: Record<string, unknown>;
}): void {
  const data = item.baseData;
  if (!data) {
    return;
  }

  for (const field of URL_FIELDS) {
    const value = data[field];
    if (typeof value === 'string') {
      data[field] = redactEmailUrl(value);
    }
  }
}

/**
 * The same redaction for any other place a URL leaves the app, such as Google Analytics page
 * views. URLs outside the email paths come back unchanged.
 */
export function redactEmailUrl(value: string): string {
  return EMAIL_PATH.test(value) ? redact(value) : value;
}

function redact(value: string): string {
  const withoutFragment = value.includes('/email-preferences')
    ? value.replace(/#.*$/, '')
    : value;
  return withoutFragment.replace(TOKEN_PARAMS, '$1REDACTED');
}
