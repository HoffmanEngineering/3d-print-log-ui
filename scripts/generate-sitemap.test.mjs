import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunk,
  escapeXml,
  buildUrlset,
  buildIndex,
  contentUrls,
  pageUrls,
} from './sitemap-lib.mjs';
import { MARKETING_ROUTES, DOC_ROUTES } from './marketing-routes.mjs';

test('chunk splits into size-bounded groups', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const chunks = chunk(items, 10);
  assert.equal(chunks.length, 3);
  assert.deepEqual(
    chunks.map((c) => c.length),
    [10, 10, 5]
  );
});

test('chunk returns empty array for empty input', () => {
  assert.deepEqual(chunk([], 10), []);
});

test('escapeXml escapes the five XML entities', () => {
  assert.equal(escapeXml(`a&b<c>d"e'f`), 'a&amp;b&lt;c&gt;d&quot;e&apos;f');
});

test('buildUrlset wraps each url in a loc and a valid urlset', () => {
  const xml = buildUrlset(['https://x/a', 'https://x/b']);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/x\/a<\/loc>/);
  assert.match(xml, /<loc>https:\/\/x\/b<\/loc>/);
  assert.doesNotMatch(xml, /changefreq|priority/);
});

test('buildUrlset escapes ampersands in urls', () => {
  const xml = buildUrlset(['https://x/a?b=1&c=2']);
  assert.match(xml, /<loc>https:\/\/x\/a\?b=1&amp;c=2<\/loc>/);
});

test('buildIndex references each child with a lastmod', () => {
  const xml = buildIndex([
    { loc: 'https://x/sitemap-pages.xml', lastmod: '2026-07-05' },
  ]);
  assert.match(xml, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/x\/sitemap-pages\.xml<\/loc>/);
  assert.match(xml, /<lastmod>2026-07-05<\/lastmod>/);
});

test('contentUrls builds encoded absolute urls from numeric and string ids', () => {
  assert.deepEqual(contentUrls('https://x', 'prints', [4, '7']), [
    'https://x/prints/4',
    'https://x/prints/7',
  ]);
});

test('contentUrls rejects null/undefined/object ids', () => {
  assert.throws(() => contentUrls('https://x', 'prints', [1, null]));
  assert.throws(() => contentUrls('https://x', 'prints', [{ id: 1 }]));
  assert.throws(() => contentUrls('https://x', 'prints', [undefined]));
});

test('pageUrls prefixes each route with the origin', () => {
  assert.deepEqual(pageUrls('https://x', ['', 'docs/prints']), [
    'https://x/',
    'https://x/docs/prints',
  ]);
});

test('DOC_ROUTES lists the 15 concrete doc pages under docs/', () => {
  assert.equal(DOC_ROUTES.length, 15);
  assert.ok(DOC_ROUTES.every((r) => r.startsWith('docs/')));
  assert.ok(DOC_ROUTES.includes('docs/getting-started'));
  assert.ok(DOC_ROUTES.includes('docs/privacy-policy'));
  // No redirect-only or disabled routes.
  assert.ok(!DOC_ROUTES.includes('docs/filaments'));
  assert.ok(!DOC_ROUTES.includes('docs/terms-of-service'));
});

test('DOC_ROUTES do not overlap MARKETING_ROUTES', () => {
  const overlap = DOC_ROUTES.filter((r) => MARKETING_ROUTES.includes(r));
  assert.deepEqual(overlap, []);
});
