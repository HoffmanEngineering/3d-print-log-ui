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

/** Raw call: the corpus is exactly what the test passes. */
const validate = (sources, anchors = {}, releases = []) =>
  validateDocs({ sources, releases, anchorBaseline: anchors }).map(
    (p) => p.message
  );

/**
 * The landing page every valid corpus must contain, since /docs redirects to it.
 * Injected so a test about one page does not have to restate that invariant.
 */
const landingPage = () =>
  source({
    slug: 'getting-started',
    sourceFile: 'getting-started.md',
    navLabel: 'Getting Started',
    group: 'start',
    title: 'Getting Started | 3D Print Log Docs',
    description: `${DESCRIPTION} Getting started edition.`,
    body: '## Getting Started\n',
  });

const run = (sources, anchors = {}) =>
  validate(
    sources.some((s) => s.slug === 'getting-started')
      ? sources
      : [...sources, landingPage()],
    anchors
  );

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
    source({
      slug: 'materials',
      navLabel: 'Materials',
      sourceFile: 'materials.md',
    }),
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

  assert.ok(
    problems.some((p) => p.includes('description')),
    problems.join('\n')
  );
});

test('reports a link to a doc page that does not exist', () => {
  assert.deepEqual(messages({ body: 'See [Nope](/docs/nope).\n' }), [
    'prints.md: link to /docs/nope, but there is no doc page "nope".',
  ]);
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
  assert.deepEqual(messages({ body: '## Prints\n\nSee [Setup](#setup).\n' }), [
    'prints.md: link to #setup, but no element on the page declares that id.',
  ]);
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
  assert.deepEqual(messages({ body: '<script>alert(1)</script>\n' }), [
    'prints.md: element <script> is not in the docs element allowlist.',
  ]);
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
  assert.deepEqual(messages({ body: 'Endpoint {{ mcpEndpoint }}.\n' }), [
    'prints.md: template references "mcpEndpoint", which is not declared in constants: or by a component:.',
  ]);
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
  assert.equal(messages({ description: 'short', mode: 'novel' }).length, 2);
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
  // Targets this fixture's own page: the array literal must not be read as a
  // class member, and the route behind it is now link-checked as well.
  assert.deepEqual(
    messages({
      body: [
        '```angular-html',
        `<a [routerLink]="['/docs/prints']">Prints</a>`,
        '```',
        '',
      ].join('\n'),
    }),
    []
  );
});

// --- findings from the adversarial review -----------------------------------

// A raw HTML block passes through untouched, and property-bound routerLink is an
// established pattern in the sources (getting-started.md uses it three times).
// Scanning only for unbound, double-quoted attributes let a dead route ship --
// which is exactly how two links to /docs/integrations, a route that has never
// existed, survived in the MCP page.
test('reports a dead route behind a property-bound routerLink', () => {
  assert.deepEqual(
    messages({
      body: '## Prints\n\n<a [routerLink]="[\'/docs/missing\']">gone</a>\n',
    }),
    ['prints.md: link to /docs/missing, but there is no doc page "missing".']
  );
});

test('reports a dead route behind a single-quoted attribute', () => {
  assert.deepEqual(
    messages({ body: "## Prints\n\n<a routerLink='/docs/missing'>gone</a>\n" }),
    ['prints.md: link to /docs/missing, but there is no doc page "missing".']
  );
});

test('accepts a property-bound routerLink to a page that exists', () => {
  assert.deepEqual(
    messages({
      body: '## Prints\n\n<a [routerLink]="[\'/docs/prints\']">ok</a>\n',
    }),
    []
  );
});

// A dormant page is excluded from route generation, so a link to it resolves
// against nothing at runtime even though the source file is still present.
test('reports a link to a dormant page', () => {
  const problems = run([
    source({ body: '## Prints\n\n[gone](/docs/retired)\n' }),
    source({
      slug: 'retired',
      sourceFile: 'retired.md',
      title: 'Retired | 3D Print Log Docs',
      description: `${DESCRIPTION} Retired.`,
      navLabel: 'Retired',
      dormant: true,
    }),
  ]);

  assert.deepEqual(problems, [
    'prints.md: link to /docs/retired, but there is no doc page "retired".',
  ]);
});

// The baseline is keyed by route, and the check used to run inside the loop over
// current sources -- so deleting a page took its published anchors with it and
// nothing noticed.
test('reports published anchors orphaned by a deleted page', () => {
  assert.deepEqual(run([source()], { 'docs/removed': ['setup', 'install'] }), [
    'docs-anchors.json: docs/removed has published anchors ("setup", "install") but no doc page exists.',
  ]);
});

// extractAnchors deduplicates, which is right for the contract check and wrong
// here: two elements sharing an id make the deep link ambiguous.
test('reports a duplicate id within a page', () => {
  assert.deepEqual(
    messages({ body: '## Prints\n\n### One {#dup}\n\n### Two {#dup}\n' }),
    ['prints.md: id "dup" is declared more than once.']
  );
});

// The default child route is a generator constant, so nothing tied it to a page
// that exists: deleting or retiring the landing page left /docs redirecting to
// a route no projection emits.
test('reports a missing default doc page', () => {
  const problems = validate([
    source({
      slug: 'about',
      sourceFile: 'about.md',
      navLabel: 'About',
      group: 'about',
    }),
  ]);

  assert.ok(
    problems.some((p) => /default doc page "getting-started"/.test(p)),
    `expected a default-page problem, got ${JSON.stringify(problems)}`
  );
});

test('reports a dormant default doc page', () => {
  const problems = validate([
    source({
      slug: 'getting-started',
      sourceFile: 'getting-started.md',
      navLabel: 'Start',
      group: 'start',
      dormant: true,
    }),
  ]);

  assert.ok(
    problems.some((p) => /default doc page "getting-started"/.test(p)),
    `expected a default-page problem, got ${JSON.stringify(problems)}`
  );
});

// A page whose Markdown fails to render used to be indistinguishable from a
// deleted one: the render error short-circuits before anchorsBySlug gets a key,
// so both anchor checks fired and claimed the page did not exist.
test('does not invent anchor problems for a page that failed to render', () => {
  const problems = run(
    [source({ body: '## Prints\n\n```angular-html\nunterminated\n' })],
    { 'docs/prints': ['list'] }
  );

  assert.equal(problems.length, 1);
  assert.match(problems[0], /^prints\.md: Unterminated code fence/);
});

// A matrix-parameter navigation is a valid Angular link. Harvesting every
// quoted substring in the array turned `{ tab: 'details' }` into a path
// segment and reported a page that was never linked.
test('ignores a routerLink array carrying a matrix-parameter object', () => {
  assert.deepEqual(
    messages({
      body: `## P\n\n<a [routerLink]="['/docs', 'prints', { tab: 'details' }]">x</a>\n`,
    }),
    []
  );
});

// A segment that is a class member cannot be resolved statically. Guessing at
// the path would either invent a link or hide a real one; skipping is honest.
test('ignores a routerLink array with a non-literal segment', () => {
  assert.deepEqual(
    messages({
      constants: { target: 'missing' },
      body: `## P\n\n<a [routerLink]="['/docs', target]">x</a>\n`,
    }),
    []
  );
});

test('still resolves a routerLink array of plain string segments', () => {
  assert.deepEqual(
    messages({ body: `## P\n\n<a [routerLink]="['/docs', 'nope']">x</a>\n` }),
    ['prints.md: link to /docs/nope, but there is no doc page "nope".']
  );
});

test('reports a duplicate id declared with single quotes', () => {
  assert.deepEqual(
    messages({
      body: "## P\n\n<div id='same'></div>\n\n<span id='same'></span>\n",
    }),
    ['prints.md: id "same" is declared more than once.']
  );
});

test('accepts a fragment link to a single-quoted id', () => {
  assert.deepEqual(
    messages({
      body: "## P\n\n<div id='setup'></div>\n\nSee [Setup](#setup).\n",
    }),
    []
  );
});

// -- release notes -----------------------------------------------------------

const releaseNotesPage = () =>
  source({
    slug: 'release-notes',
    sourceFile: 'release-notes.md',
    navLabel: 'Release Notes',
    group: 'about',
    title: 'Release Notes | 3D Print Log Docs',
    description: `${DESCRIPTION} Release notes edition.`,
    body: '## Release Notes\n',
  });

const release = (over = {}) => ({
  version: '1.49.1',
  date: '2026-08-29',
  title: 'Push Notification Fixes',
  highlights: [],
  body: 'Tapping a notification opens the print.',
  sourceFile: '1.49.1.md',
  ...over,
});

test('a release anchor satisfies the contract even though the page has no heading', () => {
  // The heading lives in src/content/release-notes, not in the page body, so
  // without the release corpus the contract check would report every published
  // anchor as deleted.
  const problems = validate(
    [landingPage(), releaseNotesPage()],
    { 'docs/release-notes': ['v1.49.1'] },
    [release()]
  );

  assert.deepEqual(problems, []);
});

test('a deleted release breaks the published anchor contract', () => {
  const problems = validate(
    [landingPage(), releaseNotesPage()],
    { 'docs/release-notes': ['v1.38.0'] },
    [release()]
  );

  assert.equal(problems.length, 1);
  assert.match(problems[0], /anchor "v1\.38\.0" was published previously/);
});

test('two releases claiming one version are rejected', () => {
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release(),
    release({ sourceFile: 'duplicate.md' }),
  ]);

  assert.ok(problems.some((p) => /already declared by/.test(p)));
});

test('a release version the anchor generator cannot use is rejected', () => {
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ version: 'next', sourceFile: 'next.md' }),
  ]);

  assert.ok(problems.some((p) => /must be numeric/.test(p)));
});

test('a release without an ISO date is rejected', () => {
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ date: 'August 2026' }),
  ]);

  assert.ok(problems.some((p) => /must be a quoted ISO date/.test(p)));
});

test('a release title carrying an HTML entity is rejected', () => {
  // It would render literally in the archive and in the GitHub Release title.
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ title: 'SEO &amp; Sitemap' }),
  ]);

  assert.ok(problems.some((p) => /write the character itself/.test(p)));
});

test('a release title that is not a string is rejected', () => {
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ title: 141 }),
  ]);

  assert.ok(problems.some((p) => /"title" must be a string/.test(p)));
});

test('an empty release title is allowed', () => {
  // 1.29.0 shipped with a bare version heading; that is legal, not an oversight.
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ title: '' }),
  ]);

  assert.deepEqual(problems, []);
});

test('a highlights value that is not a sequence is rejected', () => {
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ highlights: 'labels' }),
  ]);

  assert.ok(problems.some((p) => /"highlights" must be a sequence/.test(p)));
});

test('a dead docs link inside a release is caught', () => {
  // Release prose is checked like any other page content: it is on the page a
  // reader reaches, even when it renders from the archive.
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release({ body: 'See [the guide](/docs/nowhere).' }),
  ]);

  assert.ok(problems.some((p) => /there is no doc page "nowhere"/.test(p)));
});

test('two releases declaring the same anchor are caught as a duplicate id', () => {
  const problems = validate([landingPage(), releaseNotesPage()], {}, [
    release(),
    release({ sourceFile: 'copy.md' }),
  ]);

  assert.ok(
    problems.some((p) => /id "v1\.49\.1" is declared more than once/.test(p))
  );
});

test('accepts a link to a derived heading anchor the generator will emit', () => {
  // The generated page gives every h2-h4 an id. Validating the bare Markdown
  // render instead rejected exactly the anchors the deployed page declares.
  assert.deepEqual(
    messages({
      body: '## Prints\n\n### Print List\n\nSee [the list](#print-list).\n',
    }),
    []
  );
});

test('accepts a cross-page link to another page derived anchor', () => {
  const problems = run([
    source({ body: 'See [Usage](/docs/materials#material-usage).\n' }),
    source({
      slug: 'materials',
      navLabel: 'Materials',
      title: 'Materials | 3D Print Log Docs',
      description: `${DESCRIPTION} Materials edition.`,
      sourceFile: 'materials.md',
      body: '## Materials\n\n### Material Usage\n',
    }),
  ]);

  assert.deepEqual(problems, []);
});

test('still reports a fragment link matching no heading on the page', () => {
  // Derived ids widen what may be linked to; they must not turn the check off.
  assert.deepEqual(
    messages({
      body: '## Prints\n\n### Print List\n\nSee [gone](#print-lst).\n',
    }),
    [
      'prints.md: link to #print-lst, but no element on the page declares that id.',
    ]
  );
});

test('reports a doc-figure with no alt', () => {
  assert.deepEqual(
    messages({
      body: '## Prints\n\n<doc-figure src="./a.png" width="8" height="6"></doc-figure>\n',
    }),
    [
      'prints.md: <doc-figure> is missing alt; describe what the screenshot shows.',
    ]
  );
});

test('reports a doc-figure whose alt is empty', () => {
  // `alt` being a required input only makes the binding required. An empty one
  // compiles and marks the screenshot decorative, which it never is.
  assert.deepEqual(
    messages({
      body: '## Prints\n\n<doc-figure src="./a.png" alt="" width="8" height="6"></doc-figure>\n',
    }),
    [
      'prints.md: <doc-figure> has an empty alt; describe what the screenshot shows.',
    ]
  );
});

test('accepts a doc-figure that describes its image', () => {
  assert.deepEqual(
    messages({
      body: '## Prints\n\n<doc-figure src="./a.png" alt="The print list" width="8" height="6"></doc-figure>\n',
    }),
    []
  );
});

// --- <doc-figure name="..."> ------------------------------------------------

/** One page whose body is `body`, validated against a captures map. */
const figureMessages = (body, captures = {}) =>
  validateDocs({
    sources: [source({ body: `## Prints\n\n${body}\n` }), landingPage()],
    captures,
  }).map((p) => p.message);

const CAPTURES = {
  'print-list': {
    light: {
      src: '/assets/docs/captures/print-list_a1.webp',
      width: 8,
      height: 6,
    },
    dark: {
      src: '/assets/docs/captures/print-list_dark_b2.webp',
      width: 8,
      height: 6,
    },
  },
};

test('accepts a doc-figure naming a capture that exists', () => {
  assert.deepEqual(
    figureMessages(
      '<doc-figure name="print-list" alt="The print list"></doc-figure>',
      CAPTURES
    ),
    []
  );
});

test('reports a doc-figure naming a capture that does not exist', () => {
  // The gate the whole pipeline hangs off: assets are content-hashed and
  // committed, so a figure whose capture never ran is a broken image on a
  // published page and nothing else would notice.
  const [message] = figureMessages(
    '<doc-figure name="print-detail" alt="A print"></doc-figure>',
    CAPTURES
  );
  assert.match(message, /names a capture that does not exist/);
});

test('reports a doc-figure that binds both name and src', () => {
  const [message] = figureMessages(
    '<doc-figure name="print-list" src="./a.png" alt="A print"></doc-figure>',
    CAPTURES
  );
  assert.match(message, /binds both name and src/);
});

test('reports a doc-figure that binds neither name nor src', () => {
  assert.deepEqual(figureMessages('<doc-figure alt="A print"></doc-figure>'), [
    'prints.md: <doc-figure> binds neither name nor src; it has no image to show.',
  ]);
});

test('reports hand-typed dimensions on a named doc-figure', () => {
  // They would pin numbers the next recapture invalidates without touching the
  // Markdown, which is the whole reason the map carries them.
  const [message] = figureMessages(
    '<doc-figure name="print-list" alt="A print" width="8" height="6"></doc-figure>',
    CAPTURES
  );
  assert.match(message, /takes its dimensions from the capture/);
});

test('reports a src doc-figure missing its dimensions', () => {
  assert.deepEqual(
    figureMessages('<doc-figure src="./a.png" alt="A print"></doc-figure>'),
    [
      'prints.md: <doc-figure> for "./a.png" is missing width; without it the image reflows the prose as it loads.',
      'prints.md: <doc-figure> for "./a.png" is missing height; without it the image reflows the prose as it loads.',
    ]
  );
});

test('accepts a doc-figure whose alt contains a > character', () => {
  // The tag matcher used to stop at the first `>` wherever it appeared, so this
  // truncated mid-attribute and was reported as binding neither name nor src.
  assert.deepEqual(
    figureMessages(
      '<doc-figure name="print-list" alt="Filtered to prints > 10 hours"></doc-figure>',
      CAPTURES
    ),
    []
  );
});

test('reads single-quoted doc-figure attributes', () => {
  assert.deepEqual(
    figureMessages(
      "<doc-figure name='print-list' alt='He said \"no\"'></doc-figure>",
      CAPTURES
    ),
    []
  );
});

test('reports a doc-figure tag it could not parse', () => {
  // An unbalanced quote makes the tag regex fail rather than match a truncated
  // fragment. Silently skipping it would mean the figure escaped every rule
  // above — no alt check, no name resolution.
  const [message] = figureMessages(
    '<doc-figure name="print-list alt="A print"></doc-figure>',
    CAPTURES
  );
  assert.match(message, /could not be parsed/);
});

test('the tag matcher does not backtrack on a long run of quotes', () => {
  // js/redos: with overlapping alternatives a run of quotes could be decomposed
  // exponentially many ways and this would never return.
  const started = Date.now();
  figureMessages(`<doc-figure alt=${'"'.repeat(60)}`, CAPTURES);
  assert.ok(Date.now() - started < 1000, 'tag matching should be linear');
});
