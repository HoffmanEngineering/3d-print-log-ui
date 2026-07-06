import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  chunk,
  buildUrlset,
  buildIndex,
  contentUrls,
  pageUrls,
} from './sitemap-lib.mjs';
import {
  MARKETING_ROUTES,
  DOC_ROUTES,
  SITE_ORIGIN,
} from './marketing-routes.mjs';

const API_URL = (
  process.env.SITEMAP_API_URL || 'https://api.3dprintlog.com'
).replace(/\/+$/, '');
const ORIGIN = (process.env.SITEMAP_SITE_ORIGIN || SITE_ORIGIN).replace(
  /\/+$/,
  ''
);
const OUT_DIR = process.env.SITEMAP_OUT_DIR || 'dist/print-log-ui/browser';
const CHUNK_SIZE = 20000;

async function fetchIds(path) {
  const res = await fetch(`${API_URL}${path}`);
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

function writeChunks(prefix, urls, files) {
  chunk(urls, CHUNK_SIZE).forEach((c, i) => {
    const name = `${prefix}-${i + 1}.xml`;
    writeFileSync(join(OUT_DIR, name), buildUrlset(c));
    files.push(name);
  });
}

async function main() {
  const printIds = await fetchIds('/api/Prints/public');
  const userIds = await fetchIds('/api/Users/public');

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const staticPageUrls = pageUrls(ORIGIN, [...MARKETING_ROUTES, ...DOC_ROUTES]);
  const printUrls = contentUrls(ORIGIN, 'prints', printIds);
  const userUrls = contentUrls(ORIGIN, 'users', userIds);

  const files = [];
  writeFileSync(join(OUT_DIR, 'sitemap-pages.xml'), buildUrlset(staticPageUrls));
  files.push('sitemap-pages.xml');
  writeChunks('sitemap-prints', printUrls, files);
  writeChunks('sitemap-users', userUrls, files);

  const today = new Date().toISOString().slice(0, 10);
  const index = buildIndex(
    files.map((f) => ({ loc: `${ORIGIN}/${f}`, lastmod: today }))
  );
  writeFileSync(join(OUT_DIR, 'sitemap.xml'), index);

  console.log(
    `Sitemap generated in ${OUT_DIR}: ${files.length} child sitemaps ` +
      `(${staticPageUrls.length} pages, ${printUrls.length} prints, ${userUrls.length} users).`
  );
}

main().catch((err) => {
  console.error(`Sitemap generation FAILED: ${err.message}`);
  process.exit(1);
});
