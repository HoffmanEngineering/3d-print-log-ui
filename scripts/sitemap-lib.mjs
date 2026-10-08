// Sitemap builders. Pure and side-effect-free apart from fetchPrintRows /
// fetchJsonArray, which take their `fetch` as an argument. Safe to import in
// unit tests.

export function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Each entry is a URL string or `{ loc, lastmod? }`. `lastmod` is written only
// when present: an entry with no truthful modification date gets no tag at all
// rather than a guessed one (#214).
export function buildUrlset(entries) {
  const body = entries
    .map((e) => {
      const { loc, lastmod } = typeof e === 'string' ? { loc: e } : e;
      const tag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : '';
      return `  <url><loc>${escapeXml(loc)}</loc>${tag}</url>`;
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>\n'
  );
}

// `lastmod` is optional here too: a child sitemap none of whose entries carries
// one (the users chunks, today) is listed without it.
export function buildIndex(entries) {
  const body = entries
    .map((e) => {
      const tag = e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : '';
      return `  <sitemap><loc>${escapeXml(e.loc)}</loc>${tag}</sitemap>`;
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</sitemapindex>\n'
  );
}

// Nothing on this site predates it, so an earlier value is an unset column, not
// a real modification.
const EARLIEST_LASTMOD = Date.UTC(2015, 0, 1);
// Tolerates clock skew between the API host and the build runner. Anything
// further ahead is not a real modification time either.
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// A full timestamp must carry its zone. Without one, `Date` would read it as
// runner-local time and shift the date.
const DATE_TIME_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/;

function toMs(value) {
  return Date.parse(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value);
}

// Normalizes a modification time to a W3C datetime for <lastmod>, or returns
// undefined when the value is missing, malformed, implausibly old or in the
// future. Callers omit the tag on undefined; this never substitutes "now".
//
// A date-only value (docs frontmatter) stays date-only. A timestamp is
// normalized to UTC with whole seconds.
export function normalizeLastmod(value, now = Date.now()) {
  if (typeof value !== 'string') return undefined;
  const dateOnly = DATE_ONLY.test(value);
  if (!dateOnly && !DATE_TIME_WITH_ZONE.test(value)) return undefined;
  const ms = toMs(value);
  if (
    Number.isNaN(ms) ||
    ms < EARLIEST_LASTMOD ||
    ms > now + MAX_FUTURE_SKEW_MS
  ) {
    return undefined;
  }
  const iso = new Date(ms).toISOString();
  // Date.parse rolls 2026-02-31 over into March; the round trip catches it.
  if (dateOnly) return iso.slice(0, 10) === value ? value : undefined;
  return `${iso.slice(0, 19)}Z`;
}

// The latest of the given normalized lastmod values, or undefined when none has
// one. Each child's <lastmod> in the sitemap index is the max of its entries.
export function maxLastmod(values) {
  let best;
  let bestMs = -Infinity;
  for (const v of values) {
    if (!v) continue;
    const ms = toMs(v);
    if (ms > bestMs) {
      bestMs = ms;
      best = v;
    }
  }
  return best;
}

// Build encoded absolute content entries, rejecting malformed ids. Each row is
// either a bare id (the `/public` shape) or `{ id, lastModified }` (the
// `/public/sitemap` shape). IDs come from a public API and are expected to be
// numbers (or numeric strings); anything null/undefined/object is a contract
// violation and must fail loudly. A bad `lastModified` only drops the tag.
export function contentEntries(origin, segment, rows, now = Date.now()) {
  return rows.map((row) => {
    const isObject = row !== null && typeof row === 'object';
    const id = isObject ? row.id : row;
    if (id === null || id === undefined || typeof id === 'object') {
      throw new Error(`invalid id in ${segment}: ${JSON.stringify(row)}`);
    }
    const loc = `${origin}/${segment}/${encodeURIComponent(String(id))}`;
    const lastmod = isObject
      ? normalizeLastmod(row.lastModified, now)
      : undefined;
    return lastmod ? { loc, lastmod } : { loc };
  });
}

// `lastmods` maps a route to its modification date. Routes without one (the
// marketing pages, whose content spans many source files) get no tag.
export function pageEntries(
  origin,
  routes,
  lastmods = new Map(),
  now = Date.now()
) {
  return routes.map((r) => {
    const loc = `${origin}/${r}`;
    const lastmod = normalizeLastmod(lastmods.get(r), now);
    return lastmod ? { loc, lastmod } : { loc };
  });
}

// Doc route -> lastmod, from the generated docs manifest: each page's `updated`
// frontmatter. The release-notes page changes whenever a release is added, so it
// takes the newer of its own date and the newest release's.
export function docLastmods(manifest) {
  const out = new Map();
  const newestRelease = maxLastmod(
    (manifest.releases ?? []).map((r) => normalizeLastmod(r.date))
  );
  for (const page of manifest.pages ?? []) {
    if (page.dormant) continue;
    const own = normalizeLastmod(page.updated);
    const value =
      page.slug === 'release-notes' ? maxLastmod([own, newestRelease]) : own;
    if (value) out.set(page.path, value);
  }
  return out;
}

// Fetches the public prints with their modification times, falling back to the
// bare-id endpoint while an API without `/public/sitemap` is still deployed, or
// when that endpoint does not answer within `timeoutMs` (API v1.15.0 shipped it
// hanging). The fallback still lists every print, only without <lastmod>. A
// server error is fatal, so a real outage never silently ships a thin sitemap:
// the fallback endpoint would fail the same way.
export async function fetchPrintRows(
  fetchImpl,
  apiUrl,
  { timeoutMs = 60_000 } = {}
) {
  const path = '/api/Prints/public/sitemap';
  const bareIds = async () => ({
    rows: await fetchJsonArray(fetchImpl, apiUrl, '/api/Prints/public'),
    withLastmod: false,
  });
  try {
    // The signal also bounds reading the body, so the read stays inside the try.
    const res = await fetchImpl(`${apiUrl}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 404) return await bareIds();
    return { rows: await readJsonArray(res, path), withLastmod: true };
  } catch (err) {
    if (err?.name !== 'TimeoutError') throw err;
    console.warn(
      `${path} did not answer within ${timeoutMs}ms; listing prints without <lastmod>.`
    );
    return bareIds();
  }
}

export async function fetchJsonArray(fetchImpl, apiUrl, path) {
  return readJsonArray(await fetchImpl(`${apiUrl}${path}`), path);
}

async function readJsonArray(res, path) {
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`${path} -> response is not a JSON array`);
  }
  // An empty array is a valid state (a new or staging environment with no public
  // content yet). Marketing pages still produce a sitemap; the content chunks are
  // simply omitted. Only a failed request or a non-array shape is fatal, so a real
  // API outage never silently ships a thin sitemap.
  return data;
}
