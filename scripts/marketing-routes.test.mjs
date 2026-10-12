import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { INTEGRATIONS, MARKETING_ROUTES } from './marketing-routes.mjs';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The prerendered paths declared in app.routes.server.ts. A marketing route
// missing there is client-rendered, so crawlers get an empty shell.
const prerenderedPaths = [
  ...read('src/app/app.routes.server.ts').matchAll(
    /\{\s*path:\s*'([^']*)',\s*renderMode:\s*RenderMode\.Prerender\s*\}/g
  ),
].map((m) => m[1]);

test('app.routes.server.ts prerenders exactly the marketing routes', () => {
  assert.deepEqual(
    [...prerenderedPaths].sort(),
    [...MARKETING_ROUTES].sort(),
    'scripts/marketing-routes.mjs and app.routes.server.ts disagree'
  );
});

test('the Klipper integration page is a marketing route', () => {
  assert.ok(INTEGRATIONS.includes('klipper'));
  assert.ok(MARKETING_ROUTES.includes('klipper'));
});

test('every marketing route has a client route in app-routing.module.ts', () => {
  const routing = read('src/app/app-routing.module.ts');
  for (const route of MARKETING_ROUTES) {
    assert.match(
      routing,
      new RegExp(`path:\\s*'${route}'`),
      `no client route for /${route}`
    );
  }
});

test('the bridge docs overview links to the Klipper page', () => {
  assert.match(
    read('src/content/docs/printlog-bridge.md'),
    /\]\(\/klipper\)/,
    'src/content/docs/printlog-bridge.md does not link /klipper'
  );
});

test('the homepage links to every integration page', () => {
  const home = read('src/app/home/home.component.html');
  for (const route of INTEGRATIONS) {
    assert.match(home, new RegExp(`routerLink="/${route}"`), `/${route}`);
  }
});
