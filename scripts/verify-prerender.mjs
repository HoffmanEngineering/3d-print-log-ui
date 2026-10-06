import { readFileSync, existsSync } from 'node:fs';
import {
  SITE_ORIGIN,
  MARKETING_ROUTES,
  DOC_ROUTES,
  TIER1,
  HUB,
  FORKS,
} from './marketing-routes.mjs';

const DIST = 'dist/print-log-ui/browser';

// The single source for Pro prices; the homepage Offers must match it.
const PRO_PRICING = JSON.parse(
  readFileSync(
    new URL('../src/content/pro-pricing.json', import.meta.url),
    'utf8'
  )
);

// Docs pages written as a numbered "Step N:" walkthrough, which therefore carry
// a HowTo. buildDocHowTo derives it from the outline; this list pins it.
const DOC_HOWTO_ROUTES = [
  'docs/klipper',
  'docs/slic3r-uploader',
  'docs/log-your-first-print',
];
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
function markdownAlternateHref(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (
      /rel\s*=\s*"alternate"/i.test(tag) &&
      /type\s*=\s*"text\/markdown"/i.test(tag)
    ) {
      const m = tag.match(/href\s*=\s*"([^"]*)"/i);
      if (m) return m[1];
    }
  }
  return '';
}
// Parse the page's <script type="application/ld+json"> and return its @graph
// array. Returns null if missing/invalid JSON.
function jsonLdGraph(html) {
  const m = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return null;
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return null;
  }
  return Array.isArray(data['@graph']) ? data['@graph'] : [];
}
function jsonLdTypes(graph) {
  return new Set(graph.map((n) => n && n['@type']).filter(Boolean));
}
// Every object anywhere in the graph, so nested nodes (a parentOrganization)
// count as declaring an @id and nested references get checked too.
function jsonLdObjects(value, out = []) {
  if (Array.isArray(value)) {
    for (const v of value) jsonLdObjects(v, out);
  } else if (value && typeof value === 'object') {
    out.push(value);
    for (const v of Object.values(value)) jsonLdObjects(v, out);
  }
  return out;
}
// A bare { "@id": ... } is a reference. It has to name a node declared in the
// same graph, or a consumer sees a pointer to nothing.
function danglingJsonLdRefs(graph) {
  const objects = jsonLdObjects(graph);
  const declared = new Set(
    objects
      .filter((o) => o['@id'] && Object.keys(o).length > 1)
      .map((o) => o['@id'])
  );
  return objects
    .filter((o) => o['@id'] && Object.keys(o).length === 1)
    .map((o) => o['@id'])
    .filter((id) => !declared.has(id));
}
const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};
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

for (const r of [...routes, ...DOC_ROUTES]) {
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
  // Pre-paint theme script: without it the prerendered (light) HTML flashes before
  // ThemeService applies the saved dark theme on boot.
  if (
    !(
      html.includes("localStorage.getItem('theme-mode')") &&
      html.includes("classList.add('dark-theme')")
    )
  )
    errors.push(
      `${file}: missing pre-paint theme script (dark-mode flash guard)`
    );
  // Structured data (JSON-LD): every prerendered page carries a valid @graph with
  // the @type(s) expected for its route class.
  const graph = jsonLdGraph(html);
  if (!graph) {
    errors.push(`${file}: missing or invalid JSON-LD (application/ld+json)`);
  } else {
    const types = jsonLdTypes(graph);
    const expected =
      r === ''
        ? ['WebApplication', 'MobileApplication', 'Organization']
        : DOC_ROUTES.includes(r)
          ? [
              'TechArticle',
              'BreadcrumbList',
              'Organization',
              ...(DOC_HOWTO_ROUTES.includes(r) ? ['HowTo'] : []),
            ]
          : ['HowTo'];
    for (const t of expected) {
      if (!types.has(t)) {
        errors.push(`${file}: JSON-LD missing @type "${t}"`);
      }
    }
    for (const id of danglingJsonLdRefs(graph)) {
      errors.push(`${file}: JSON-LD references @id "${id}" it never declares`);
    }
    if (r === '') checkHomeJsonLd(file, graph, desc);
  }
}

// The homepage's JSON-LD is what an agent reads to answer "what is this, who
// runs it, how do I reach them, and what does it cost" (#212).
function checkHomeJsonLd(file, graph, metaDescription) {
  const node = (type) => graph.find((n) => n['@type'] === type) ?? {};
  const app = node('WebApplication');
  const mobile = node('MobileApplication');
  const org = node('Organization');

  for (const [label, n] of [
    ['WebApplication', app],
    ['MobileApplication', mobile],
  ]) {
    if (!n.description) {
      errors.push(`${file}: ${label} has no description`);
    } else if (n.description !== metaDescription) {
      errors.push(
        `${file}: ${label} description differs from the meta description`
      );
    }
  }

  const sameAs = Array.isArray(org.sameAs) ? org.sameAs : [];
  if (sameAs.length === 0 || !sameAs.every(isHttpsUrl)) {
    errors.push(
      `${file}: Organization sameAs must be a non-empty list of https URLs`
    );
  }
  const contact = org.contactPoint ?? {};
  if (contact['@type'] !== 'ContactPoint' || !contact.email) {
    errors.push(`${file}: Organization has no ContactPoint with an email`);
  }
  // Owner decision (#217): never publish a postal address.
  if ('address' in org) {
    errors.push(`${file}: Organization must not publish an address`);
  }

  // Free plus every plan in pro-pricing.json, each with a price, a currency and,
  // for the paid ones, a billing period.
  const offers = Array.isArray(app.offers) ? app.offers : [];
  for (const offer of offers) {
    if (
      offer['@type'] !== 'Offer' ||
      offer.price === undefined ||
      !offer.priceCurrency
    ) {
      errors.push(
        `${file}: Offer "${offer.name}" needs price and priceCurrency`
      );
    }
  }
  if (!offers.some((o) => String(o.price) === '0')) {
    errors.push(`${file}: no free Offer`);
  }
  for (const plan of PRO_PRICING.plans) {
    const offer = offers.find((o) => o.price === plan.price);
    const spec = offer?.priceSpecification ?? {};
    if (!offer) {
      errors.push(`${file}: no Offer for ${plan.id} at ${plan.price}`);
    } else if (
      spec['@type'] !== 'UnitPriceSpecification' ||
      spec.price !== plan.price ||
      spec.priceCurrency !== PRO_PRICING.currency ||
      spec.billingDuration !== plan.billingDuration
    ) {
      errors.push(`${file}: ${plan.id} Offer has a wrong priceSpecification`);
    }
  }
}

// Markdown twins (#211). The homepage and every docs page advertise one with
// <link rel="alternate" type="text/markdown">, and each advertised file must be
// real Markdown in dist: "an advertisement pointing at HTML is worse than none".
for (const r of [...routes, ...DOC_ROUTES]) {
  const file = `${DIST}/${r ? r + '/' : ''}index.html`;
  if (!existsSync(file)) continue; // already reported above
  const href = markdownAlternateHref(readFileSync(file, 'utf8'));
  const required = r === '' || DOC_ROUTES.includes(r);
  if (!href) {
    if (required) errors.push(`${file}: no Markdown alternate link`);
    continue;
  }
  let url;
  try {
    url = new URL(href);
  } catch {
    errors.push(`${file}: Markdown alternate "${href}" is not an absolute URL`);
    continue;
  }
  if (url.origin !== ORIGIN || !url.pathname.endsWith('.md')) {
    errors.push(
      `${file}: Markdown alternate "${href}" is not a .md on ${ORIGIN}`
    );
    continue;
  }
  const twin = `${DIST}${decodeURIComponent(url.pathname)}`;
  if (!existsSync(twin)) {
    errors.push(`${file}: advertises ${href}, but ${twin} does not exist`);
    continue;
  }
  const body = readFileSync(twin, 'utf8').trimStart();
  if (body.startsWith('<')) {
    errors.push(`${twin} is HTML, not Markdown`);
  } else if (!body.startsWith('# ')) {
    errors.push(`${twin} does not start with a "# " heading`);
  }
}
for (const name of ['docs/llms.txt', 'llms.md']) {
  const file = `${DIST}/${name}`;
  if (!existsSync(file)) {
    errors.push(`missing ${name}`);
  } else if (!readFileSync(file, 'utf8').startsWith('# ')) {
    errors.push(`${name} does not start with a "# " heading`);
  }
}
if (
  existsSync(`${DIST}/llms.md`) &&
  existsSync(`${DIST}/llms.txt`) &&
  readFileSync(`${DIST}/llms.md`, 'utf8') !==
    readFileSync(`${DIST}/llms.txt`, 'utf8')
) {
  errors.push('llms.md differs from llms.txt');
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

// llms.txt must ship as a real Markdown file (not the SPA fallback HTML)
// and expose at least one H1 so LLM crawlers can parse it.
if (!existsSync(`${DIST}/llms.txt`)) {
  errors.push('missing llms.txt');
} else {
  const llms = readFileSync(`${DIST}/llms.txt`, 'utf8');
  const trimmed = llms.trimStart();
  if (/^<!doctype|^<html/i.test(trimmed)) {
    errors.push('llms.txt is HTML (SPA fallback), not Markdown');
  }
  if (!/^# .+/m.test(llms)) {
    errors.push('llms.txt is missing an H1 heading');
  }
}

// auth.md (#209) tells agents how to authenticate. Same failure mode as llms.txt:
// without the file, the 404 page answers in its place.
if (!existsSync(`${DIST}/auth.md`)) {
  errors.push('missing auth.md');
} else if (
  /^<!doctype|^<html/i.test(readFileSync(`${DIST}/auth.md`, 'utf8').trimStart())
) {
  errors.push('auth.md is HTML, not Markdown');
}

// Discovery files (#210). The folder is a dot-directory, so check it reached
// the build output, that each file parses, and that the legacy AI Catalog copy
// still matches ard.json byte for byte.
const discovery = {};
for (const name of [
  'api-catalog',
  'mcp/server-card.json',
  'ard.json',
  'ai-catalog.json',
]) {
  const file = `${DIST}/.well-known/${name}`;
  if (!existsSync(file)) {
    errors.push(`missing .well-known/${name}`);
    continue;
  }
  discovery[name] = readFileSync(file, 'utf8');
  try {
    JSON.parse(discovery[name]);
  } catch (error) {
    errors.push(`.well-known/${name} is not valid JSON: ${error.message}`);
  }
}
if (
  discovery['ard.json'] !== undefined &&
  discovery['ard.json'] !== discovery['ai-catalog.json']
) {
  errors.push('.well-known/ai-catalog.json differs from ard.json');
}
if (existsSync(`${DIST}/llms.txt`)) {
  const llms = readFileSync(`${DIST}/llms.txt`, 'utf8');
  if (!/^## When to use 3D Print Log$/m.test(llms)) {
    errors.push('llms.txt is missing its "When to use" section');
  }
}

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
    for (const r of [...MARKETING_ROUTES, ...DOC_ROUTES]) {
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
  `Prerender verification passed: ${routes.length + DOC_ROUTES.length} routes (${routes.length} marketing + ${DOC_ROUTES.length} docs); unique titles+descriptions, OG/Twitter, canonicals, JSON-LD structured data, fork hooks + hub links, homepage link graph, crawl files, discovery files, Markdown twins.`
);
