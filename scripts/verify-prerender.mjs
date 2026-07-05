import { readFileSync, existsSync } from 'node:fs';
import {
  SITE_ORIGIN,
  MARKETING_ROUTES,
  TIER1,
  HUB,
  FORKS,
} from './marketing-routes.mjs';

const DIST = 'dist/print-log-ui/browser';
const ORIGIN = SITE_ORIGIN;
const routes = MARKETING_ROUTES;

const errors = [];
const titles = new Map();
const descs = new Map();

// Attribute-order tolerant: find a <meta ...> tag whose text contains `idAttr`,
// then read its content="" from anywhere in that tag.
function metaContent(html, idAttr) {
  const re = /<meta\b[^>]*>/gi;
  for (const tag of html.match(re) || []) {
    if (tag.includes(idAttr)) {
      const m = tag.match(/content\s*=\s*"([^"]*)"/i);
      if (m) return m[1];
    }
  }
  return '';
}
function canonicalHref(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (/rel\s*=\s*"canonical"/i.test(tag)) {
      const m = tag.match(/href\s*=\s*"([^"]*)"/i);
      if (m) return m[1];
    }
  }
  return '';
}
function read(route) {
  const file = `${DIST}/${route ? route + '/' : ''}index.html`;
  if (!existsSync(file)) {
    errors.push(`missing prerendered file: ${file}`);
    return null;
  }
  return { file, html: readFileSync(file, 'utf8') };
}
function uniq(map, key, value, file, label) {
  if (!value) {
    errors.push(`${file}: no ${label}`);
    return;
  }
  if (map.has(value))
    errors.push(
      `${file}: duplicate ${label} "${value}" (also ${map.get(value)})`
    );
  else map.set(value, file);
}

for (const r of routes) {
  const doc = read(r);
  if (!doc) continue;
  const { file, html } = doc;
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const desc = metaContent(html, 'name="description"');
  uniq(titles, title, title, file, 'title');
  uniq(descs, desc, desc, file, 'meta description');
  const expected = `${ORIGIN}/${r}`;
  if (canonicalHref(html) !== expected)
    errors.push(`${file}: canonical "${canonicalHref(html)}" != "${expected}"`);
  // OG/Twitter (homepage + all slicer pages set these via the meta service)
  if (!metaContent(html, 'property="og:title"'))
    errors.push(`${file}: missing og:title`);
  if (!metaContent(html, 'property="og:type"'))
    errors.push(`${file}: missing og:type`);
  if (metaContent(html, 'name="twitter:card"') !== 'summary_large_image')
    errors.push(`${file}: missing/wrong twitter:card`);
}

// Fork pages: each must link to the hub in body and carry its own hook (checked via a
// per-route marker string that must appear in the config's uniqueHook).
const forkHookMarker = {
  'snapmaker-orca': 'Snapmaker',
  'anycubic-slicer': 'Anycubic',
  'elegoo-slicer': 'Elegoo',
  'qidi-studio': 'QIDI',
  'orca-flashforge': 'FlashForge',
};
for (const f of FORKS) {
  const doc = read(f);
  if (!doc) continue;
  if (!doc.html.includes(`href="/${HUB}"`))
    errors.push(`${doc.file}: no in-body link to /${HUB}`);
  if (!doc.html.includes(forkHookMarker[f]))
    errors.push(
      `${doc.file}: unique hook marker "${forkHookMarker[f]}" not found`
    );
}

// Homepage link graph: must link to all Tier 1 pages + hub.
const home = read('');
if (home) {
  for (const t of [...TIER1, HUB]) {
    if (!home.html.includes(`href="/${t}"`))
      errors.push(`homepage: no link to /${t}`);
  }
}
// Hub page: must link to every fork.
const hub = read(HUB);
if (hub) {
  for (const f of FORKS) {
    if (!hub.html.includes(`href="/${f}"`))
      errors.push(`hub: no link to /${f}`);
  }
}

// robots.txt is a static asset and must always ship.
if (!existsSync(`${DIST}/robots.txt`)) errors.push('missing robots.txt');

// sitemap.xml is generated at deploy time by scripts/generate-sitemap.mjs, not on
// PR builds. When present it must be a sitemap index referencing sitemap-pages.xml,
// and sitemap-pages.xml must list every marketing route.
if (existsSync(`${DIST}/sitemap.xml`)) {
  const idx = readFileSync(`${DIST}/sitemap.xml`, 'utf8');
  if (!/<sitemapindex\b/i.test(idx)) {
    errors.push('sitemap.xml is not a <sitemapindex>');
  }
  if (!idx.includes('/sitemap-pages.xml')) {
    errors.push('sitemap.xml index does not reference sitemap-pages.xml');
  }
  const pagesFile = `${DIST}/sitemap-pages.xml`;
  if (!existsSync(pagesFile)) {
    errors.push('missing sitemap-pages.xml');
  } else {
    const pages = readFileSync(pagesFile, 'utf8');
    for (const r of MARKETING_ROUTES) {
      const u = `${ORIGIN}/${r}`;
      if (!pages.includes(`<loc>${u}</loc>`)) {
        errors.push(`sitemap-pages.xml missing ${u}`);
      }
    }
  }
}

if (errors.length) {
  console.error(
    'Prerender verification FAILED:\n' + errors.map((e) => ' - ' + e).join('\n')
  );
  process.exit(1);
}
console.log(
  `Prerender verification passed: ${routes.length} routes; unique titles+descriptions, OG/Twitter, canonicals, fork hooks + hub links, homepage link graph, crawl files.`
);
