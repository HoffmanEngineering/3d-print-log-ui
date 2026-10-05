// A notification's `actionUrl` is one string, but `routerLink` wants its path, query params and
// fragment separately. Passing the whole string as the path would encode a `?` into the route
// (achievement links carry `?badge=`), so every consumer splits it with these.

/** The path, without query string or fragment. */
export function actionUrlPath(url: string | null): string | null {
  if (!url) return null;
  const end = url.search(/[?#]/);
  return end >= 0 ? url.substring(0, end) : url;
}

/** The query string as router query params, or null when there is none. */
export function actionUrlQueryParams(
  url: string | null
): Record<string, string> | null {
  if (!url) return null;
  const start = url.indexOf('?');
  if (start < 0) return null;
  const hash = url.indexOf('#', start);
  const params: Record<string, string> = {};
  new URLSearchParams(
    url.substring(start + 1, hash >= 0 ? hash : undefined)
  ).forEach((value, key) => (params[key] = value));
  return params;
}

/** The fragment, without its `#`, or null. */
export function actionUrlFragment(url: string | null): string | null {
  if (!url) return null;
  const hash = url.indexOf('#');
  return hash >= 0 ? url.substring(hash + 1) : null;
}
