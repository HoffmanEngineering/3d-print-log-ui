/** The URL-bearing fields Application Insights puts on page views, dependencies and requests. */
const URL_FIELDS = ['uri', 'refUri', 'name', 'target', 'url'] as const;

/** The by-tag lookup's path segment: GET /api/Filaments/by-tag/{uid}. */
// Up to the next path, query or fragment delimiter only: a UID may carry spaces as separators.
const BY_TAG_SEGMENT = /(\/by-tag\/)[^/?#]+/gi;

/** A tag query parameter, in case a URL ever carries one. */
const TAG_PARAM = /([?&]tag=)[^&#]*/gi;

/**
 * Application Insights telemetry initializer that keeps spool tag UIDs out of telemetry.
 *
 * The SDK records every fetch as a dependency, and a phone that reads tags looks one up by
 * UID in the URL path. The scanned UID handed to /materials/new travels in navigation state,
 * not the URL, so page views never carry one; the query parameter is redacted anyway.
 */
export function redactTagUids(item: {
  baseData?: Record<string, unknown>;
}): void {
  const data = item.baseData;
  if (!data) {
    return;
  }

  for (const field of URL_FIELDS) {
    const value = data[field];
    if (typeof value === 'string') {
      data[field] = value
        .replace(BY_TAG_SEGMENT, '$1REDACTED')
        .replace(TAG_PARAM, '$1REDACTED');
    }
  }
}
