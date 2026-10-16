// Angular reads `routerLink="/docs/x#y"` as one path and encodes the # as %23,
// so the link lands on "Page not found". The anchor belongs in the `fragment`
// input. This pins every template under src/app, generated and hand-written.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const APP_DIR = fileURLToPath(new URL('../src/app', import.meta.url));

/** A `routerLink` whose value (plain, or a bound string literal) contains `#`. */
export const FRAGMENT_IN_ROUTER_LINK =
  /\s\[?routerLink\]?=(?:"[^"]*#[^"]*"|'[^']*#[^']*')/g;

function* templates(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* templates(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

test('the pattern catches a fragment inside a routerLink value', () => {
  assert.equal(
    '<a routerLink="/docs/x#y">x</a>'.match(FRAGMENT_IN_ROUTER_LINK)?.length,
    1
  );
  assert.equal(
    `<a [routerLink]="['/docs/x#y']">x</a>`.match(FRAGMENT_IN_ROUTER_LINK)
      ?.length,
    1
  );
  assert.equal(
    '<a routerLink="/docs/x" fragment="y">x</a>'.match(FRAGMENT_IN_ROUTER_LINK),
    null
  );
});

test('no template puts a #fragment inside routerLink', () => {
  const offenders = [];
  for (const file of templates(APP_DIR)) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(FRAGMENT_IN_ROUTER_LINK)) {
      offenders.push(
        `${path.relative(APP_DIR, file)}:${match[0].trim()} (use fragment="...")`
      );
    }
  }
  assert.deepEqual(offenders, []);
});
