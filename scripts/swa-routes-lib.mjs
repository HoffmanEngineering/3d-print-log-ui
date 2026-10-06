// How Azure Static Web Apps resolves a request against the `routes` in
// `src/staticwebapp.config.json`, modeled closely enough to test which paths
// load the SPA and which fall through to a real 404.
//
// There is deliberately no `navigationFallback`: it turned every unknown path
// (including /.well-known/* probes from agents) into a 200 with the app shell.
// Instead each top-level SPA segment has an explicit rewrite rule, and anything
// that is neither a file nor a rule gets the static 404.html with a 404 status.

/**
 * Whether an SWA route pattern matches a request path. `*` matches any run of
 * characters, `/prints/*` matches everything under `/prints/` but not `/prints`
 * itself, and matching ignores case, as SWA does.
 */
export function matchSwaRoute(pattern, path) {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}$`, 'i').test(path);
}

/**
 * The rewrite target SWA serves for a path that has no file of its own, or
 * `null` when no rule rewrites it (the request 404s). The first matching rule
 * wins, so a header-only rule that matches first ends the search.
 */
export function resolveSwaRewrite(config, path) {
  const rule = (config.routes ?? []).find((r) => matchSwaRoute(r.route, path));
  return rule?.rewrite ?? null;
}

/**
 * The redirect the first matching rule issues for a path, as
 * `{ location, statusCode }`, or `null` when that rule does not redirect (or
 * no rule matches). SWA defaults a redirect without a status code to 302.
 */
export function resolveSwaRedirect(config, path) {
  const rule = (config.routes ?? []).find((r) => matchSwaRoute(r.route, path));
  if (!rule?.redirect) return null;
  return { location: rule.redirect, statusCode: rule.statusCode ?? 302 };
}

/**
 * The top-level paths declared in `appRoutes` (app-routing.module.ts). Read
 * from source because these scripts run on plain Node with no TS loader; the
 * file has no nested `path:` keys, so every match is a top-level route.
 */
export function topLevelAppPaths(routingSource) {
  return [...routingSource.matchAll(/\bpath:\s*'([^']*)'/g)].map((m) => m[1]);
}
