import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MANIFEST_JSON } from './docs-paths.mjs';
import { DOC_ROUTES, MARKETING_ROUTES } from './marketing-routes.mjs';
import {
  matchSwaRoute,
  resolveSwaRewrite,
  topLevelAppPaths,
} from './swa-routes-lib.mjs';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const config = JSON.parse(read('src/staticwebapp.config.json'));
const appPaths = topLevelAppPaths(read('src/app/app-routing.module.ts'));
const manifest = JSON.parse(readFileSync(MANIFEST_JSON, 'utf8'));

const SHELLS = ['/shells/app-shell.html', '/shells/list-skeleton.html'];

/** Top-level segments that only exist in the client router (no prerendered file). */
const clientSegments = [
  ...new Set(
    appPaths.filter(
      (p) => p !== '**' && p !== 'docs' && !MARKETING_ROUTES.includes(p)
    )
  ),
];

const docAliases = manifest.pages
  .filter((page) => !page.dormant)
  .flatMap((page) => page.aliases.map((alias) => `docs/${alias}`));

/* -------------------------------------------------------------------------- */
/* matchSwaRoute                                                               */
/* -------------------------------------------------------------------------- */

test('matchSwaRoute: an exact pattern matches only that path', () => {
  assert.ok(matchSwaRoute('/prints', '/prints'));
  assert.ok(matchSwaRoute('/prints', '/PRINTS'));
  assert.ok(!matchSwaRoute('/prints', '/prints/1'));
  assert.ok(!matchSwaRoute('/prints', '/printsx'));
});

test('matchSwaRoute: a /* pattern matches below the segment, not beside it', () => {
  assert.ok(matchSwaRoute('/prints/*', '/prints/1'));
  assert.ok(matchSwaRoute('/prints/*', '/prints/1/edit'));
  assert.ok(!matchSwaRoute('/prints/*', '/prints'));
  assert.ok(!matchSwaRoute('/prints/*', '/printsx/1'));
});

test('resolveSwaRewrite: the first matching rule wins', () => {
  const cfg = {
    routes: [
      { route: '/a', rewrite: '/first.html' },
      { route: '/a', rewrite: '/second.html' },
    ],
  };
  assert.equal(resolveSwaRewrite(cfg, '/a'), '/first.html');
  assert.equal(resolveSwaRewrite(cfg, '/b'), null);
});

/* -------------------------------------------------------------------------- */
/* Real 404s (issue #208)                                                      */
/* -------------------------------------------------------------------------- */

test('there is no catch-all navigation fallback', () => {
  // A fallback answers every unknown path with 200 + the app shell, so an agent
  // probing /.well-known/ard.json records the feature as broken, not absent.
  assert.equal(config.navigationFallback, undefined);
});

test('a 404 serves the static 404 page', () => {
  assert.equal(config.responseOverrides?.['404']?.rewrite, '/404.html');
  const page = read('src/404.html');
  assert.match(page, /<meta name="robots" content="noindex"/);
  assert.match(page, /href="\/llms\.txt"/);
});

test('404.html ships as a build asset in every configuration', () => {
  const angular = JSON.parse(read('angular.json'));
  const build = Object.values(angular.projects)[0].architect.build;
  const assetLists = [
    build.options.assets,
    ...Object.values(build.configurations).map((c) => c.assets),
  ].filter(Boolean);
  assert.ok(assetLists.length > 0);
  for (const assets of assetLists) {
    assert.ok(
      assets.includes('src/404.html'),
      'src/404.html missing from assets'
    );
  }
});

test('paths that are never SPA routes are not rewritten to the app', () => {
  for (const path of [
    '/this-does-not-exist-xyz',
    '/.well-known/ard.json',
    '/.well-known/ai-catalog.json',
    '/.well-known/api-catalog',
    '/.well-known/http-message-signatures-directory',
    '/.well-known/mcp/server-card.json',
    '/.well-known/openid-configuration',
    '/openapi.json',
    '/auth.md',
    '/index.md',
    '/llms.md',
    '/assets/missing.png',
    '/main-ABC123.js',
    '/docs/does-not-exist',
    '/printsx',
  ]) {
    assert.equal(resolveSwaRewrite(config, path), null, `${path} is rewritten`);
  }
});

/* -------------------------------------------------------------------------- */
/* Every SPA route still loads the app                                         */
/* -------------------------------------------------------------------------- */

test('the routing module parse finds the known top-level routes', () => {
  // Guards the regex: if it silently matched nothing, the coverage test below
  // would pass vacuously.
  for (const p of ['prints', 'printers', 'materials', 'docs', '**', '']) {
    assert.ok(appPaths.includes(p), `appRoutes parse missed '${p}'`);
  }
});

test('every client-only top-level route has a rewrite rule', () => {
  // Fails when a route is added to app-routing.module.ts without a matching
  // rule in staticwebapp.config.json: that page would 404 on a hard refresh.
  for (const segment of clientSegments) {
    for (const path of [`/${segment}`, `/${segment}/some/child`]) {
      assert.ok(
        SHELLS.includes(resolveSwaRewrite(config, path)),
        `${path} has no rewrite to an app shell; add "/${segment}" and "/${segment}/*" rules`
      );
    }
  }
});

test('the list pages keep their skeleton shell', () => {
  for (const path of ['/prints', '/materials', '/filament', '/printers']) {
    assert.equal(resolveSwaRewrite(config, path), '/shells/list-skeleton.html');
  }
});

test('the docs root and doc aliases load the app', () => {
  // /docs and the alias paths redirect in the client router; they have no file.
  assert.ok(docAliases.length > 0, 'expected at least one doc alias');
  for (const path of ['docs', 'docs/', ...docAliases]) {
    assert.equal(
      resolveSwaRewrite(config, `/${path}`),
      '/shells/app-shell.html',
      `/${path} has no rewrite rule`
    );
  }
});

test('no rule rewrites a prerendered page', () => {
  // A rewrite would shadow the static HTML and serve the empty shell instead.
  for (const route of [...MARKETING_ROUTES, ...DOC_ROUTES]) {
    assert.equal(
      resolveSwaRewrite(config, `/${route}`),
      null,
      `/${route} is prerendered but rewritten`
    );
  }
});

/* -------------------------------------------------------------------------- */
/* /auth.md (issue #209)                                                       */
/* -------------------------------------------------------------------------- */

test('auth.md ships as a build asset in every configuration', () => {
  const angular = JSON.parse(read('angular.json'));
  const build = Object.values(angular.projects)[0].architect.build;
  const assetLists = [
    build.options.assets,
    ...Object.values(build.configurations).map((c) => c.assets),
  ].filter(Boolean);
  for (const assets of assetLists) {
    assert.ok(
      assets.includes('src/auth.md'),
      'src/auth.md missing from assets'
    );
  }
});

test('Markdown files are served as text/markdown', () => {
  // Agents probing /auth.md decide by content type whether they found the
  // file or an HTML page.
  assert.match(config.mimeTypes?.['.md'] ?? '', /^text\/markdown\b/);
});

test('auth.md follows the auth.md section layout and links the docs', () => {
  const authMd = read('src/auth.md');
  assert.match(authMd, /^# auth\.md$/m);
  for (const heading of [
    /^## Step 1 — Discover$/m,
    /^## Step 2 — Pick a method$/m,
    /^## Step 3 — Register$/m,
    /^## Step 4 — Claim ceremony$/m,
    /^## Step 5 — Exchange$/m,
    /^## Step 6 — Use the access_token$/m,
    /^## Errors$/m,
    /^## Revocation$/m,
  ]) {
    assert.match(authMd, heading);
  }
  assert.ok(authMd.includes('https://www.3dprintlog.com/docs/api'));
  // Honesty about the extension we do not implement.
  assert.match(authMd, /does \*\*not\*\* implement the `agent_auth` extension/);
});
