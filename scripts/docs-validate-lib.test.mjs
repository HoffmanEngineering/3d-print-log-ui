import assert from 'node:assert/strict';
import test from 'node:test';

import { validateDocs } from './docs-validate-lib.mjs';

const DESCRIPTION =
  'Log every 3D print with photos, filament usage, print time, and settings today.';

const source = (over = {}) => ({
  slug: 'prints',
  title: 'Tracking Prints | 3D Print Log Docs',
  description: DESCRIPTION,
  navLabel: 'Prints',
  group: 'features',
  order: 10,
  mode: 'how-to',
  updated: '2026-08-28',
  sourceFile: 'prints.md',
  body: '## Prints\n\nLog a print.\n',
  ...over,
});

const run = (sources, anchors = {}) =>
  validateDocs({ sources, anchorBaseline: anchors }).map((p) => p.message);

const messages = (over, anchors) => run([source(over)], anchors);

test('a well-formed page reports no problems', () => {
  assert.deepEqual(run([source()]), []);
});

test('reports a missing required frontmatter field', () => {
  const { title, ...rest } = source();
  assert.deepEqual(run([rest]), [
    'prints.md: missing required frontmatter field "title".',
  ]);
});

test('reports a frontmatter field of the wrong type', () => {
  assert.deepEqual(messages({ order: 'ten' }), [
    'prints.md: frontmatter field "order" must be a number.',
  ]);
});

test('reports an unknown Diataxis mode', () => {
  assert.deepEqual(messages({ mode: 'novel' }), [
    'prints.md: mode "novel" is not one of tutorial, how-to, reference, explanation.',
  ]);
});

test('reports an updated date that is not ISO formatted', () => {
  assert.deepEqual(messages({ updated: '28/08/2026' }), [
    'prints.md: updated "28/08/2026" must be an ISO date (YYYY-MM-DD).',
  ]);
});

test('reports a description shorter than 50 characters', () => {
  assert.deepEqual(messages({ description: 'Too short.' }), [
    'prints.md: description is 10 characters; must be 50-170.',
  ]);
});

test('reports a description longer than 170 characters', () => {
  assert.equal(messages({ description: 'x'.repeat(171) }).length, 1);
});

test('reports a title reused by another doc page', () => {
  const problems = run([
    source(),
    source({ slug: 'materials', navLabel: 'Materials', sourceFile: 'materials.md' }),
  ]);

  assert.ok(
    problems.some((p) => p.includes('title') && p.includes('materials.md')),
    problems.join('\n')
  );
});

test('reports a description reused by another doc page', () => {
  const problems = run([
    source(),
    source({
      slug: 'materials',
      navLabel: 'Materials',
      title: 'Materials | 3D Print Log Docs',
      sourceFile: 'materials.md',
    }),
  ]);

  assert.ok(problems.some((p) => p.includes('description')), problems.join('\n'));
});

test('reports a link to a doc page that does not exist', () => {
  assert.deepEqual(
    messages({ body: 'See [Nope](/docs/nope).\n' }),
    ['prints.md: link to /docs/nope, but there is no doc page "nope".']
  );
});

test('accepts a link to an alias of a real page', () => {
  assert.deepEqual(
    run([
      source({ body: 'See [Materials](/docs/filaments).\n' }),
      source({
        slug: 'materials',
        navLabel: 'Materials',
        title: 'Materials | 3D Print Log Docs',
        description: `${DESCRIPTION} Materials edition.`,
        aliases: ['filaments'],
        sourceFile: 'materials.md',
        body: '## Materials\n',
      }),
    ]),
    []
  );
});

test('accepts a link into the app that is not a doc page', () => {
  assert.deepEqual(messages({ body: 'Go to [Materials](/materials).\n' }), []);
});

test('reports a fragment link to an anchor the page does not define', () => {
  assert.deepEqual(
    messages({ body: '## Prints\n\nSee [Setup](#setup).\n' }),
    ['prints.md: link to #setup, but no element on the page declares that id.']
  );
});

test('accepts a fragment link to an anchor the page declares', () => {
  assert.deepEqual(
    messages({ body: '## Setup {#setup}\n\nSee [Setup](#setup).\n' }),
    []
  );
});

test('reports a cross-page fragment link to an anchor that does not exist', () => {
  const problems = run([
    source({ body: 'See [Usage](/docs/materials#usage).\n' }),
    source({
      slug: 'materials',
      navLabel: 'Materials',
      title: 'Materials | 3D Print Log Docs',
      description: `${DESCRIPTION} Materials edition.`,
      sourceFile: 'materials.md',
      body: '## Materials\n',
    }),
  ]);

  assert.deepEqual(problems, [
    'prints.md: link to /docs/materials#usage, but that page declares no id "usage".',
  ]);
});

test('reports a previously published anchor that the page no longer declares', () => {
  // Anchors are contractual: a bookmark to #remaining must keep resolving.
  assert.deepEqual(
    messages({ body: '## Prints\n' }, { 'docs/prints': ['remaining'] }),
    [
      'prints.md: anchor "remaining" was published previously and is no longer declared.',
    ]
  );
});

test('accepts a page that still declares every previously published anchor', () => {
  assert.deepEqual(
    messages(
      { body: '## Remaining {#remaining}\n' },
      { 'docs/prints': ['remaining'] }
    ),
    []
  );
});

test('allows a page to add an anchor that was never published', () => {
  assert.deepEqual(
    messages({ body: '## New {#brand-new}\n' }, { 'docs/prints': [] }),
    []
  );
});

test('reports an element outside the allowlist', () => {
  assert.deepEqual(
    messages({ body: '<script>alert(1)</script>\n' }),
    ['prints.md: element <script> is not in the docs element allowlist.']
  );
});

test('accepts the Angular elements the docs actually use', () => {
  assert.deepEqual(
    messages({
      body: [
        '```angular-html',
        '<mat-icon color="accent">star</mat-icon>',
        '<youtube-player videoId="abc"></youtube-player>',
        '<button mat-raised-button color="primary">Go</button>',
        '```',
        '',
      ].join('\n'),
    }),
    []
  );
});

test('reports an interpolated member the page never declares', () => {
  assert.deepEqual(
    messages({ body: 'Endpoint {{ mcpEndpoint }}.\n' }),
    [
      'prints.md: template references "mcpEndpoint", which is not declared in constants: or by a component:.',
    ]
  );
});

test('accepts an interpolated member declared in constants', () => {
  assert.deepEqual(
    messages({
      constants: { mcpEndpoint: 'https://api.3dprintlog.com/mcp' },
      body: 'Endpoint {{ mcpEndpoint }}.\n',
    }),
    []
  );
});

test('does not police members on a page that keeps a hand-written component', () => {
  assert.deepEqual(
    messages({
      component: { className: 'DocsPrintsComponent', path: '../x' },
      body: '@if (authService.isAuthenticated$ | async) { <p>Hi</p> }\n',
    }),
    []
  );
});

test('reports every problem it finds rather than stopping at the first', () => {
  assert.equal(
    messages({ description: 'short', mode: 'novel' }).length,
    2
  );
});

test('does not read an object-literal key as a class member', () => {
  // `[ngStyle.lt-md]="{ display: 'block' }"` names a CSS property, not a field.
  assert.deepEqual(
    messages({
      body: [
        '```angular-html',
        `<img [ngStyle.lt-md]="{ display: 'block', 'max-width': '90%' }" src="/a.png" />`,
        '```',
        '',
      ].join('\n'),
    }),
    []
  );
});

test('does not read the contents of a string literal as class members', () => {
  // `{{'...'}}` is how a page shows literal braces without Angular evaluating them.
  assert.deepEqual(
    messages({ body: `Config: {{'url: jsons://x/api/Moonraker?key=abc'}}\n` }),
    []
  );
});

test('does not read a routerLink array literal as class members', () => {
  assert.deepEqual(
    messages({
      body: [
        '```angular-html',
        `<a [routerLink]="['/docs/release-notes']">Notes</a>`,
        '```',
        '',
      ].join('\n'),
    }),
    []
  );
});
