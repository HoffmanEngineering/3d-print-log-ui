import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  chunk,
  buildUrlset,
  buildIndex,
  contentEntries,
  pageEntries,
  maxLastmod,
  fetchPrintRows,
  fetchJsonArray,
  fetchOptionalJsonArray,
} from './sitemap-lib.mjs';
import {
  MARKETING_ROUTES,
  DOC_ROUTES,
  DOC_LASTMODS,
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

// Every child file is listed in the index with the latest <lastmod> of its own
// entries, or with none when no entry has one. Never the build date: that would
// tell crawlers everything changed on every deploy (#214).
function writeFile(name, entries, index) {
  writeFileSync(join(OUT_DIR, name), buildUrlset(entries));
  index.push({
    loc: `${ORIGIN}/${name}`,
    lastmod: maxLastmod(entries.map((e) => e.lastmod)),
  });
}

function writeChunks(prefix, entries, index) {
  chunk(entries, CHUNK_SIZE).forEach((c, i) => {
    writeFile(`${prefix}-${i + 1}.xml`, c, index);
  });
}

async function main() {
  const prints = await fetchPrintRows(fetch, API_URL);
  if (!prints.withLastmod) {
    console.warn(
      'Print entries are listed without <lastmod> (see the warning above, or the API has no /api/Prints/public/sitemap yet).'
    );
  }
  // Users carry no <lastmod>: the API has no profile modification time, and a
  // profile page also shows stats and achievements a print date would not cover.
  const userIds = await fetchJsonArray(fetch, API_URL, '/api/Users/public');
  // Projects carry no <lastmod> either: the API keeps no truthful modification
  // time for one. The UI can deploy before the API that serves this endpoint,
  // so a missing endpoint means no project entries, not a failed deploy.
  const projectIds = await fetchOptionalJsonArray(
    fetch,
    API_URL,
    '/api/Projects/public'
  );
  if (projectIds === null) {
    console.warn(
      'Project entries are omitted: the API has no /api/Projects/public yet.'
    );
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const staticPages = pageEntries(
    ORIGIN,
    [...MARKETING_ROUTES, ...DOC_ROUTES],
    DOC_LASTMODS
  );
  const printEntries = contentEntries(ORIGIN, 'prints', prints.rows);
  const userEntries = contentEntries(ORIGIN, 'users', userIds);
  const projectEntries = contentEntries(ORIGIN, 'projects', projectIds ?? []);

  const index = [];
  writeFile('sitemap-pages.xml', staticPages, index);
  writeChunks('sitemap-prints', printEntries, index);
  writeChunks('sitemap-users', userEntries, index);
  writeChunks('sitemap-projects', projectEntries, index);

  writeFileSync(join(OUT_DIR, 'sitemap.xml'), buildIndex(index));

  const dated = [
    ...staticPages,
    ...printEntries,
    ...userEntries,
    ...projectEntries,
  ].filter((e) => e.lastmod).length;
  console.log(
    `Sitemap generated in ${OUT_DIR}: ${index.length} child sitemaps ` +
      `(${staticPages.length} pages, ${printEntries.length} prints, ${userEntries.length} users, ` +
      `${projectEntries.length} projects; ` +
      `${dated} with <lastmod>).`
  );
}

main().catch((err) => {
  console.error(`Sitemap generation FAILED: ${err.message}`);
  process.exit(1);
});
