import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  chunk,
  escapeXml,
  buildUrlset,
  buildIndex,
  contentEntries,
  pageEntries,
  normalizeLastmod,
  maxLastmod,
  docLastmods,
  fetchPrintRows,
} from './sitemap-lib.mjs';
import {
  MARKETING_ROUTES,
  DOC_ROUTES,
  DOC_LASTMODS,
} from './marketing-routes.mjs';

// A RegExp matching `text` literally, so XML fragments read as written.
function literal(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

const NOW = Date.parse('2026-10-06T12:00:00Z');

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
  assert.match(
    xml,
    /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/
  );
  assert.match(xml, /<loc>https:\/\/x\/a<\/loc>/);
  assert.match(xml, /<loc>https:\/\/x\/b<\/loc>/);
  assert.doesNotMatch(xml, /changefreq|priority|lastmod/);
});

test('buildUrlset escapes ampersands in urls', () => {
  const xml = buildUrlset(['https://x/a?b=1&c=2']);
  assert.match(xml, /<loc>https:\/\/x\/a\?b=1&amp;c=2<\/loc>/);
});

test('buildUrlset writes lastmod only for entries that have one', () => {
  const xml = buildUrlset([
    { loc: 'https://x/a', lastmod: '2026-09-14' },
    { loc: 'https://x/b' },
  ]);
  assert.match(
    xml,
    literal('<url><loc>https://x/a</loc><lastmod>2026-09-14</lastmod></url>')
  );
  assert.match(xml, literal('<url><loc>https://x/b</loc></url>'));
});

test('buildIndex references each child with a lastmod', () => {
  const xml = buildIndex([
    { loc: 'https://x/sitemap-pages.xml', lastmod: '2026-07-05' },
  ]);
  assert.match(
    xml,
    /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/
  );
  assert.match(xml, /<loc>https:\/\/x\/sitemap-pages\.xml<\/loc>/);
  assert.match(xml, /<lastmod>2026-07-05<\/lastmod>/);
});

test('buildIndex omits lastmod for a child with none', () => {
  const xml = buildIndex([{ loc: 'https://x/sitemap-users-1.xml' }]);
  assert.match(
    xml,
    literal('<sitemap><loc>https://x/sitemap-users-1.xml</loc></sitemap>')
  );
  assert.doesNotMatch(xml, /lastmod|undefined/);
});

test('contentEntries builds encoded absolute urls from numeric and string ids', () => {
  assert.deepEqual(contentEntries('https://x', 'prints', [4, '7']), [
    { loc: 'https://x/prints/4' },
    { loc: 'https://x/prints/7' },
  ]);
});

test('contentEntries rejects null/undefined/object ids', () => {
  assert.throws(() => contentEntries('https://x', 'prints', [1, null]));
  assert.throws(() => contentEntries('https://x', 'prints', [undefined]));
  assert.throws(() => contentEntries('https://x', 'prints', [{}]));
  assert.throws(() => contentEntries('https://x', 'prints', [{ id: {} }]));
  assert.throws(() => contentEntries('https://x', 'prints', [{ id: null }]));
});

test('contentEntries reads { id, lastModified } rows and drops a bad lastModified', () => {
  assert.deepEqual(
    contentEntries(
      'https://x',
      'prints',
      [
        { id: 1, lastModified: '2026-09-14T08:30:00.1234567+00:00' },
        { id: 2, lastModified: null },
        { id: 3 },
        { id: 4, lastModified: 'yesterday' },
      ],
      NOW
    ),
    [
      { loc: 'https://x/prints/1', lastmod: '2026-09-14T08:30:00Z' },
      { loc: 'https://x/prints/2' },
      { loc: 'https://x/prints/3' },
      { loc: 'https://x/prints/4' },
    ]
  );
});

test('pageEntries prefixes each route with the origin and adds known lastmods', () => {
  assert.deepEqual(
    pageEntries(
      'https://x',
      ['', 'docs/prints'],
      new Map([['docs/prints', '2026-09-14']]),
      NOW
    ),
    [
      { loc: 'https://x/' },
      { loc: 'https://x/docs/prints', lastmod: '2026-09-14' },
    ]
  );
});

test('normalizeLastmod keeps a valid date and normalizes a zoned timestamp to UTC seconds', () => {
  assert.equal(normalizeLastmod('2026-09-02', NOW), '2026-09-02');
  assert.equal(
    normalizeLastmod('2026-09-14T08:30:00Z', NOW),
    '2026-09-14T08:30:00Z'
  );
  assert.equal(
    normalizeLastmod('2026-09-14T04:30:00.5-04:00', NOW),
    '2026-09-14T08:30:00Z'
  );
});

test('normalizeLastmod rejects missing, malformed, unzoned, implausible and future values', () => {
  for (const bad of [
    undefined,
    null,
    '',
    20260902,
    'not a date',
    '2026-02-31',
    '2026-09-14T08:30:00',
    '0001-01-01T00:00:00Z',
    '2014-12-31',
    '2026-10-08T00:00:00Z',
  ]) {
    assert.equal(normalizeLastmod(bad, NOW), undefined, String(bad));
  }
});

test('maxLastmod picks the latest value across dates and timestamps', () => {
  assert.equal(maxLastmod([]), undefined);
  assert.equal(maxLastmod([undefined, undefined]), undefined);
  assert.equal(
    maxLastmod(['2026-09-02', '2026-10-01T09:00:00Z', undefined, '2026-09-30']),
    '2026-10-01T09:00:00Z'
  );
});

test('docLastmods maps each page to its updated date, release notes to the newest release', () => {
  const lastmods = docLastmods({
    pages: [
      { slug: 'mcp', path: 'docs/mcp', updated: '2026-09-02' },
      {
        slug: 'release-notes',
        path: 'docs/release-notes',
        updated: '2026-08-29',
      },
      { slug: 'gone', path: 'docs/gone', updated: '2026-09-02', dormant: true },
      { slug: 'undated', path: 'docs/undated' },
    ],
    releases: [{ date: '2026-10-04' }, { date: '2026-10-05' }],
  });
  assert.deepEqual(
    [...lastmods],
    [
      ['docs/mcp', '2026-09-02'],
      ['docs/release-notes', '2026-10-05'],
    ]
  );
});

test('DOC_LASTMODS dates every doc route and no marketing route', () => {
  for (const r of DOC_ROUTES) {
    assert.match(DOC_LASTMODS.get(r) ?? '', /^\d{4}-\d{2}-\d{2}$/, r);
  }
  for (const r of MARKETING_ROUTES) assert.ok(!DOC_LASTMODS.has(r), r);
});

function stubFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const body = routes[url];
    const status =
      body === undefined ? 404 : typeof body === 'number' ? body : 200;
    return {
      ok: status === 200,
      status,
      json: async () => (status === 200 ? body : {}),
    };
  };
  return { impl, calls };
}

test('fetchPrintRows uses /public/sitemap when the API serves it', async () => {
  const { impl, calls } = stubFetch({
    'https://api/api/Prints/public/sitemap': [{ id: 1, lastModified: null }],
  });
  assert.deepEqual(await fetchPrintRows(impl, 'https://api'), {
    rows: [{ id: 1, lastModified: null }],
    withLastmod: true,
  });
  assert.deepEqual(calls, ['https://api/api/Prints/public/sitemap']);
});

test('fetchPrintRows falls back to bare ids when /public/sitemap is not deployed', async () => {
  const { impl } = stubFetch({ 'https://api/api/Prints/public': [1, 2] });
  assert.deepEqual(await fetchPrintRows(impl, 'https://api'), {
    rows: [1, 2],
    withLastmod: false,
  });
});

test('fetchPrintRows falls back to bare ids when /public/sitemap never answers', async () => {
  // v1.15.0 of the API shipped an endpoint that hangs in production; a deploy
  // must not wait on it, or fail because of it.
  const { impl: bare } = stubFetch({ 'https://api/api/Prints/public': [1, 2] });
  const impl = (url, init) =>
    url.endsWith('/public/sitemap')
      ? new Promise((_, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(init.signal.reason)
          )
        )
      : bare(url);

  assert.deepEqual(
    await fetchPrintRows(impl, 'https://api', { timeoutMs: 10 }),
    { rows: [1, 2], withLastmod: false }
  );
});

test('fetchPrintRows fails on a server error instead of falling back', async () => {
  const { impl } = stubFetch({
    'https://api/api/Prints/public/sitemap': 500,
    'https://api/api/Prints/public': [1, 2],
  });
  await assert.rejects(fetchPrintRows(impl, 'https://api'), /HTTP 500/);
});

// Runs the real generator script against a local stub API.
async function generateAgainst(routes) {
  const server = createServer((req, res) => {
    const body = routes[req.url];
    if (body === undefined) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const out = mkdtempSync(join(tmpdir(), 'sitemap-'));
  try {
    const { port } = server.address();
    const code = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['scripts/generate-sitemap.mjs'], {
        env: {
          ...process.env,
          SITEMAP_API_URL: `http://127.0.0.1:${port}`,
          SITEMAP_SITE_ORIGIN: 'https://x',
          SITEMAP_OUT_DIR: out,
        },
        stdio: 'ignore',
      });
      child.on('exit', resolve);
    });
    assert.equal(code, 0);
    const read = (f) => readFileSync(join(out, f), 'utf8');
    return {
      index: read('sitemap.xml'),
      pages: read('sitemap-pages.xml'),
      prints: read('sitemap-prints-1.xml'),
      users: read('sitemap-users-1.xml'),
    };
  } finally {
    server.close();
    rmSync(out, { recursive: true, force: true });
  }
}

test('generator writes print lastmods and indexes each child at the max of its entries', async () => {
  const { index, pages, prints, users } = await generateAgainst({
    '/api/Prints/public/sitemap': [
      { id: 1, lastModified: '2026-09-14T08:30:00+00:00' },
      { id: 2, lastModified: '2026-10-01T09:00:00+00:00' },
      { id: 3, lastModified: null },
    ],
    '/api/Users/public': [5],
  });

  assert.match(
    prints,
    literal(
      '<loc>https://x/prints/1</loc><lastmod>2026-09-14T08:30:00Z</lastmod>'
    )
  );
  assert.match(prints, literal('<loc>https://x/prints/3</loc></url>'));
  assert.match(
    index,
    literal(
      '<loc>https://x/sitemap-prints-1.xml</loc><lastmod>2026-10-01T09:00:00Z</lastmod>'
    )
  );

  assert.doesNotMatch(users, /lastmod/);
  assert.match(
    index,
    literal('<loc>https://x/sitemap-users-1.xml</loc></sitemap>')
  );

  // Docs carry their `updated` date; marketing pages carry none.
  assert.match(
    pages,
    literal(
      `<loc>https://x/docs/mcp</loc><lastmod>${DOC_LASTMODS.get('docs/mcp')}</lastmod>`
    )
  );
  assert.match(pages, literal('<loc>https://x/</loc></url>'));
  assert.equal((pages.match(/<lastmod>/g) ?? []).length, DOC_ROUTES.length);
  assert.match(
    index,
    literal(
      `<loc>https://x/sitemap-pages.xml</loc><lastmod>${maxLastmod([...DOC_LASTMODS.values()])}</lastmod>`
    )
  );
});

test('generator falls back to bare print ids against an API without /public/sitemap', async () => {
  const { index, prints } = await generateAgainst({
    '/api/Prints/public': [1, 2],
    '/api/Users/public': [5],
  });
  assert.match(prints, literal('<loc>https://x/prints/2</loc></url>'));
  assert.doesNotMatch(prints, /lastmod/);
  assert.match(
    index,
    literal('<loc>https://x/sitemap-prints-1.xml</loc></sitemap>')
  );
});

test('DOC_ROUTES lists the concrete doc pages under docs/', () => {
  // No hard-coded count: DOC_ROUTES is derived from the docs manifest, so it
  // cannot drift from the pages that exist.
  assert.ok(DOC_ROUTES.length > 0);
  assert.ok(DOC_ROUTES.every((r) => r.startsWith('docs/')));
  assert.ok(DOC_ROUTES.includes('docs/getting-started'));
  assert.ok(DOC_ROUTES.includes('docs/mcp'));
  assert.ok(DOC_ROUTES.includes('docs/privacy-policy'));
  // No redirect-only or disabled routes.
  assert.ok(!DOC_ROUTES.includes('docs/filaments'));
  assert.ok(!DOC_ROUTES.includes('docs/terms-of-service'));
});

test('DOC_ROUTES do not overlap MARKETING_ROUTES', () => {
  const overlap = DOC_ROUTES.filter((r) => MARKETING_ROUTES.includes(r));
  assert.deepEqual(overlap, []);
});
