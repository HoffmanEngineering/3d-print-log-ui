import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShell,
  findSsrArtifacts,
  localAssetRefs,
  resolveBrowserDir,
} from './shell-lib.mjs';

// Synthetic fixture covering every artifact the transform must handle. Shapes
// mirror the real prerendered index.html verified in the Task 1 spike.
const FIXTURE = `<!doctype html><html lang="en"><head>
<title>3D Print Log — Track your 3D prints</title>
<meta name="description" content="Home marketing description">
<link rel="canonical" href="https://www.3dprintlog.com/">
<meta property="og:title" content="3D Print Log">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@type":"WebApplication"}</script>
<script>(function(){var m=localStorage.getItem('theme-mode')||'system';if(m==='dark'){document.documentElement.classList.add('dark-theme');}})();</script>
<link rel="stylesheet" href="/styles-ABC123.css">
<style ng-app-id="ng">.home{color:red}</style>
<style class="flex-layout-ssr">.fx{display:flex}</style>
</head><body>
<!--nghm-->
<app-root ng-version="21.2.12" _nghost-ng-c3350497413="" ngh="7" ng-server-context="ssg"><h1>Home page content</h1></app-root>
<script>window.__jsaction_bootstrap(document.body,"ng",["click"],[]);</script>
<script id="ng-state" type="application/json">{"__nghData__":[]}</script>
<script src="/main-DEF456.js" type="module"></script>
</body></html>`;

const OPTS = {
  bodyHtml: '<div class="app-loading-shell">shell</div>',
  title: 'Loading… — 3D Print Log',
  description: 'Loading your 3D Print Log.',
};

test('buildShell removes all SSR/hydration artifacts', () => {
  const out = buildShell(FIXTURE, OPTS);
  assert.deepEqual(findSsrArtifacts(out), []);
});

test('buildShell replaces the whole app-root element with clean shell body', () => {
  const out = buildShell(FIXTURE, OPTS);
  assert.match(
    out,
    /<app-root><div class="app-loading-shell">shell<\/div><\/app-root>/
  );
  assert.doesNotMatch(out, /Home page content/);
  assert.doesNotMatch(out, /ngh=|_nghost|ng-version|ng-server-context/);
});

test('buildShell keeps bundle script, css link, and theme script', () => {
  const out = buildShell(FIXTURE, OPTS);
  assert.match(out, /<script src="\/main-DEF456\.js" type="module">/);
  assert.match(out, /<link rel="stylesheet" href="\/styles-ABC123\.css">/);
  assert.match(out, /theme-mode/);
});

test('buildShell rewrites head metadata to generic + noindex', () => {
  const out = buildShell(FIXTURE, OPTS);
  assert.match(out, /<title>Loading… — 3D Print Log<\/title>/);
  assert.match(
    out,
    /<meta name="description" content="Loading your 3D Print Log\.">/
  );
  assert.match(out, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(out, /rel="canonical"/);
  assert.doesNotMatch(out, /og:title|twitter:card/);
  assert.doesNotMatch(out, /application\/ld\+json/);
});

test('localAssetRefs returns local paths, skips external and data urls', () => {
  const html =
    `<link href="/a.css"><script src="https://cdn/x.js"></script>` +
    `<img src="data:image/png;base64,xx"><script src="/b.js"></script>`;
  assert.deepEqual(localAssetRefs(html), ['/a.css', '/b.js']);
});

test('resolveBrowserDir joins outputPath.base with browser', () => {
  const angularJson = {
    projects: {
      'print-log-ui': {
        architect: {
          build: { options: { outputPath: { base: 'dist/print-log-ui' } } },
        },
      },
    },
  };
  assert.equal(resolveBrowserDir(angularJson), 'dist/print-log-ui/browser');
});
