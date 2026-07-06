// Pure, side-effect-free sitemap builders. Safe to import in unit tests.

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

export function buildUrlset(urls) {
  const body = urls
    .map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`)
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>\n'
  );
}

export function buildIndex(entries) {
  const body = entries
    .map(
      (e) =>
        `  <sitemap><loc>${escapeXml(e.loc)}</loc><lastmod>${e.lastmod}</lastmod></sitemap>`
    )
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</sitemapindex>\n'
  );
}

// Build encoded absolute content URLs, rejecting malformed ids. IDs come from a
// public API and are expected to be numbers (or numeric strings); anything
// null/undefined/object is a contract violation and must fail loudly.
export function contentUrls(origin, segment, ids) {
  return ids.map((id) => {
    if (id === null || id === undefined || typeof id === 'object') {
      throw new Error(`invalid id in ${segment}: ${JSON.stringify(id)}`);
    }
    return `${origin}/${segment}/${encodeURIComponent(String(id))}`;
  });
}

export function pageUrls(origin, routes) {
  return routes.map((r) => `${origin}/${r}`);
}
