import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { TWINS_DIR } from './docs-build-lib.mjs';
import { CONTENT_DIR, GENERATED_DIR, MANIFEST_JSON } from './docs-paths.mjs';
import {
  absolutize,
  htmlToMarkdown,
  planTwins,
  renderDocsLlmsTxt,
  renderTwin,
  resolveConstants,
  resolveInterpolations,
  twinPath,
} from './docs-twins.mjs';
import { MARKETING_ROUTES } from './marketing-routes.mjs';
import { resolveSwaRewrite } from './swa-routes-lib.mjs';

const ORIGIN = 'https://www.3dprintlog.com';
const PAGE_URL = `${ORIGIN}/docs/prints`;

const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const md = (html, captures = {}) =>
  htmlToMarkdown(html, { captures, origin: ORIGIN, pageUrl: PAGE_URL });

function page(overrides = {}) {
  return {
    slug: 'prints',
    title: 'Tracking Prints | 3D Print Log Docs',
    description: 'Log every print.',
    navLabel: 'Prints',
    group: 'features',
    updated: '2026-08-28',
    related: [],
    dormant: false,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Angular-only syntax                                                         */
/* -------------------------------------------------------------------------- */

test('constants compose through ${this.name}, as the component does', () => {
  assert.deepEqual(
    resolveConstants({
      endpoint: 'https://api.example/mcp',
      command: 'add ${this.endpoint} --id ${this.id}',
      id: 'abc',
    }),
    {
      endpoint: 'https://api.example/mcp',
      command: 'add https://api.example/mcp --id abc',
      id: 'abc',
    }
  );
  assert.throws(() => resolveConstants({ a: '${this.a}' }), /refers to itself/);
});

test('interpolations resolve to a constant or a string literal', () => {
  assert.equal(
    resolveInterpolations('<code>{{ endpoint }}</code>', { endpoint: 'x' }),
    '<code>x</code>'
  );
  // klipper.md: a multi-line literal that carries braces of its own.
  assert.equal(
    resolveInterpolations("<pre>{{'\n{ a|b } <c>\n'}}</pre>", {}),
    '<pre>\n{ a|b } &lt;c&gt;\n</pre>'
  );
});

test('an interpolation the build cannot evaluate fails loudly', () => {
  assert.throws(
    () => resolveInterpolations('{{ user.name }}', {}, 'prints'),
    /prints: the Markdown twin cannot evaluate \{\{ user\.name \}\}/
  );
  // An inherited property is not a declared constant.
  assert.throws(() => resolveInterpolations('{{ toString }}', {}), /cannot/);
});

test('links and images become absolute URLs', () => {
  assert.equal(absolutize('/prints', ORIGIN, PAGE_URL), `${ORIGIN}/prints`);
  assert.equal(absolutize('#list', ORIGIN, PAGE_URL), `${PAGE_URL}#list`);
  // index.html sets <base href="/">, so relative assets resolve from the root.
  assert.equal(
    absolutize('./assets/a.png', ORIGIN, PAGE_URL),
    `${ORIGIN}/assets/a.png`
  );
  assert.equal(
    absolutize('assets/a.svg', ORIGIN, PAGE_URL),
    `${ORIGIN}/assets/a.svg`
  );
  assert.equal(
    absolutize('https://klipper3d.org', ORIGIN, PAGE_URL),
    'https://klipper3d.org'
  );
  assert.equal(
    absolutize('mailto:a@example.com', ORIGIN, PAGE_URL),
    'mailto:a@example.com'
  );
});

test('routerLink in both forms becomes a Markdown link', () => {
  assert.equal(
    md('<p><a routerLink="/docs/api">REST API</a></p>'),
    `[REST API](${ORIGIN}/docs/api)`
  );
  assert.equal(
    md(`<p><a [routerLink]="['/printers']" class="x">View printers</a></p>`),
    `[View printers](${ORIGIN}/printers)`
  );
});

test('an inline icon keeps its name; a decorative one is dropped', () => {
  assert.equal(
    md('<p>Click the <mat-icon inline>more_horiz</mat-icon> menu.</p>'),
    'Click the `more_horiz` menu.'
  );
  assert.equal(
    md('<p><mat-icon class="check-icon">check_circle</mat-icon> No card</p>'),
    'No card'
  );
});

test('a button reads as its label, or its aria-label when it has no text', () => {
  assert.equal(
    md('<p>Click <button mat-raised-button>Submit</button>.</p>'),
    'Click **Submit**.'
  );
  assert.equal(
    md(
      '<p>Click <button aria-label="More Menu" mat-button><mat-icon>more_horiz</mat-icon></button>.</p>'
    ),
    'Click **More Menu**.'
  );
});

/* -------------------------------------------------------------------------- */
/* Doc primitives                                                              */
/* -------------------------------------------------------------------------- */

test('a doc-figure becomes its light capture, caption and marker labels', () => {
  const captures = {
    'first-print-form': {
      light: { src: '/assets/docs/captures/form_1.webp' },
      dark: { src: '/assets/docs/captures/form_dark_1.webp' },
    },
  };
  const out = md(
    [
      '<doc-figure name="first-print-form" alt="The form [annotated]" caption="Four fields.">',
      '  <doc-marker x="7" y="9" label="Title"></doc-marker>',
      '  <doc-marker x="7" y="15" label="Printer"></doc-marker>',
      '</doc-figure>',
    ].join('\n'),
    captures
  );
  assert.equal(
    out,
    [
      `![The form annotated](${ORIGIN}/assets/docs/captures/form_1.webp)`,
      '',
      '_Four fields._',
      '',
      'Numbered markers on the image:',
      '',
      '1. Title',
      '2. Printer',
    ].join('\n')
  );
});

test('a doc-figure with a hand-placed src uses it', () => {
  assert.equal(
    md(
      '<doc-figure src="/assets/a.png" alt="A" width="1" height="1"></doc-figure>'
    ),
    `![A](${ORIGIN}/assets/a.png)`
  );
});

test('a doc-video becomes a YouTube link', () => {
  assert.equal(
    md('<doc-video videoId="E3kHsxSkBAw" title="Setup"></doc-video>'),
    '[Video: Setup](https://www.youtube.com/watch?v=E3kHsxSkBAw)'
  );
});

test('a doc-callout becomes a blockquote led by its kind', () => {
  assert.equal(
    md(
      '<doc-callout kind="warning" heading="Copy the key"><p>It is shown once.</p></doc-callout>'
    ),
    '> **Warning: Copy the key**\n>\n> It is shown once.'
  );
});

test('doc-steps are numbered in order', () => {
  const out = md(
    [
      '<doc-steps>',
      '  <doc-step heading="Install"><p>a</p></doc-step>',
      '  <doc-step heading="Configure"><p>b</p></doc-step>',
      '</doc-steps>',
    ].join('\n')
  );
  assert.equal(out, '#### Step 1: Install\n\na\n\n#### Step 2: Configure\n\nb');
});

test('a table becomes a pipe table, escaping pipes in cells', () => {
  const out = md(
    '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td><code>x|y</code></td><td>2</td></tr></tbody></table>'
  );
  assert.equal(out, '| A | B |\n| --- | --- |\n| `x\\|y` | 2 |');
});

test('code samples come back as fenced blocks with their braces decoded', () => {
  // docs-markdown escapes `{`, `}` and `@` for Angular; the twin must not.
  assert.equal(
    md('<pre><code>&#123; "a": "&#64;b" &#125;</code></pre>'),
    '```\n{ "a": "@b" }\n```'
  );
  // klipper.md puts whitespace between <pre> and <code>.
  assert.equal(
    md('<pre>\n    <code>\n  a\n    b\n</code>\n</pre>'),
    '```\na\n  b\n```'
  );
});

test('lists use a single space after the marker', () => {
  assert.equal(
    md('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'),
    '- a\n  - b\n- c'
  );
  assert.equal(md('<ol><li>one</li><li>two</li></ol>'), '1. one\n2. two');
});

/* -------------------------------------------------------------------------- */
/* Whole twins                                                                 */
/* -------------------------------------------------------------------------- */

test('a twin opens with the page title as its only h1', () => {
  const twin = renderTwin(
    page(),
    '<h2>Prints</h2>\n<hr />\n<p>Log a print.</p>\n<h3 id="list">List</h3>'
  );
  assert.ok(twin.startsWith('# Tracking Prints\n\n> Log every print.\n'));
  // The body's own "## Prints" and its rule repeat the title, so they go.
  assert.doesNotMatch(twin, /^## Prints$/m);
  assert.doesNotMatch(twin, /^---$/m);
  assert.match(twin, /^### List$/m);
  assert.match(twin, new RegExp(`HTML version: ${PAGE_URL}\\.`));
  assert.equal(twin.match(/^# /gm).length, 1);
});

test('a body with its own h1 is moved down a level', () => {
  const twin = renderTwin(
    page({
      slug: 'getting-started',
      title: 'Getting Started | 3D Print Log Docs',
    }),
    '<h1>Never lose a print</h1><h2>Benefits</h2>'
  );
  assert.match(twin, /^## Never lose a print$/m);
  assert.match(twin, /^### Benefits$/m);
  assert.equal(twin.match(/^# /gm).length, 1);
});

test('related pages link to their twins', () => {
  const printers = page({
    slug: 'printers',
    title: 'Printers | 3D Print Log Docs',
    navLabel: 'Printers',
    description: 'Manage printers.',
  });
  const twin = renderTwin(
    page({ related: ['printers', 'missing'] }),
    '<p>x</p>',
    {
      pages: [page(), printers],
    }
  );
  assert.match(
    twin,
    /^- \[Printers\]\(https:\/\/www\.3dprintlog\.com\/docs\/printers\.md\): Manage printers\.$/m
  );
});

test('docs/llms.txt groups routed pages and links each twin', () => {
  const pages = [
    page(),
    page({ slug: 'about', navLabel: 'About', group: 'about' }),
  ];
  const out = renderDocsLlmsTxt(pages, ORIGIN);
  assert.match(out, /^# 3D Print Log Docs\n\n> /);
  assert.match(
    out,
    /^## Features\n\n- \[Prints\]\(https:\/\/www\.3dprintlog\.com\/docs\/prints\.md\): /m
  );
  assert.match(out, /^## About\n\n- \[About\]/m);
  assert.doesNotMatch(out, /^## Start here$/m);
  assert.throws(
    () => renderDocsLlmsTxt([page({ group: 'misc' })], ORIGIN),
    /no heading for group\(s\): misc/
  );
});

test('a dormant page gets no twin and no index entry', () => {
  const manifest = {
    pages: [page(), page({ slug: 'terms', navLabel: 'Terms', dormant: true })],
  };
  const files = planTwins(manifest, { prints: '<p>x</p>', terms: '<p>y</p>' });
  assert.ok(files.has('docs/prints.md'));
  assert.ok(!files.has('docs/terms.md'));
  assert.doesNotMatch(files.get('docs/llms.txt'), /terms/);
  assert.ok(!files.has('llms.md'), 'llms.md needs the llms.txt source');
});

/* -------------------------------------------------------------------------- */
/* The generated tree                                                          */
/* -------------------------------------------------------------------------- */

const manifest = JSON.parse(readFileSync(MANIFEST_JSON, 'utf8'));
const routed = manifest.pages.filter((p) => !p.dormant);
const twinsRoot = path.join(GENERATED_DIR, TWINS_DIR);

test('every routed docs page has a clean Markdown twin', () => {
  assert.ok(routed.length > 0);
  for (const p of routed) {
    const file = path.join(twinsRoot, ...twinPath(p.slug).split('/'));
    assert.ok(existsSync(file), `missing twin for ${p.slug}`);
    const twin = readFileSync(file, 'utf8');
    assert.ok(twin.startsWith('# '), `${p.slug}.md must open with "# "`);
    // Strip code first: samples may legitimately show markup.
    const prose = twin.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const leftover of [
      /\{\{/,
      /routerLink/i,
      /<\/?(?:doc-|mat-|div|span|button|p|a)\b/i,
      /&#\d+;/,
    ]) {
      assert.doesNotMatch(prose, leftover, `${p.slug}.md has ${leftover}`);
    }
  }
});

test('the generated docs/llms.txt lists every routed page', () => {
  const index = readFileSync(path.join(twinsRoot, 'docs', 'llms.txt'), 'utf8');
  const links = [...index.matchAll(/\]\(([^)\s]+)\)/g)].map(
    (m) => new URL(m[1])
  );
  for (const p of routed) {
    assert.ok(
      links.some(
        (url) => url.origin === ORIGIN && url.pathname === `/docs/${p.slug}.md`
      ),
      `docs/llms.txt does not link ${p.slug}.md`
    );
  }
});

test('llms.md is a byte-for-byte copy of llms.txt', () => {
  assert.equal(
    readFileSync(path.join(twinsRoot, 'llms.md'), 'utf8'),
    read('src/llms.txt')
  );
});

/* -------------------------------------------------------------------------- */
/* /index.md                                                                   */
/* -------------------------------------------------------------------------- */

const indexMd = read('src/index.md');

test('index.md is Markdown with an h1', () => {
  assert.match(indexMd, /^# 3D Print Log\n\n> \S/);
});

test('every site link in index.md resolves to something that ships', () => {
  const statics = new Set(['/llms.txt', '/auth.md', '/docs/llms.txt']);
  const twins = new Set(routed.map((p) => `/docs/${p.slug}.md`));
  const pages = new Set(MARKETING_ROUTES.map((r) => `/${r}`));
  const links = [...indexMd.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map(
    (m) => new URL(m[1])
  );
  assert.ok(links.length > 10);
  for (const url of links.filter((u) => u.origin === ORIGIN)) {
    assert.ok(
      statics.has(url.pathname) ||
        twins.has(url.pathname) ||
        pages.has(url.pathname),
      `index.md links ${url.href}, which nothing publishes`
    );
  }
});

test('index.md quotes the same Pro prices as the docs', () => {
  // index.md is hand-written, so this is what catches a price change that
  // only reached pro-subscription.md.
  const pro = readFileSync(
    path.join(CONTENT_DIR, 'pro-subscription.md'),
    'utf8'
  );
  const plan = (name) => {
    const match = new RegExp(`\\*\\*${name}\\*\\* — (\\$\\d+\\.\\d\\d)`).exec(
      pro
    );
    assert.ok(match, `pro-subscription.md has no ${name} price`);
    return match[1];
  };
  const quoted = [...indexMd.matchAll(/\$\d+\.\d\d/g)].map((m) => m[0]);
  assert.deepEqual(quoted.sort(), [plan('Monthly'), plan('Annual')].sort());
});

/* -------------------------------------------------------------------------- */
/* Publishing                                                                  */
/* -------------------------------------------------------------------------- */

test('the twins and index.md ship as assets in every configuration', () => {
  const angular = JSON.parse(read('angular.json'));
  const build = Object.values(angular.projects)[0].architect.build;
  const assetLists = [
    build.options.assets,
    ...Object.values(build.configurations).map((c) => c.assets),
  ].filter(Boolean);
  for (const assets of assetLists) {
    assert.ok(assets.includes('src/index.md'), 'src/index.md missing');
    assert.ok(
      assets.some(
        (a) =>
          typeof a === 'object' &&
          a.input === `src/app/documentation/generated/${TWINS_DIR}` &&
          a.output === '/'
      ),
      'the twins directory is missing from assets'
    );
  }
});

test('no SWA rule rewrites a Markdown twin or index', () => {
  // A rewrite runs before the file lookup, so a rule matching /docs/x.md would
  // serve the app shell in place of the Markdown.
  const config = JSON.parse(read('src/staticwebapp.config.json'));
  for (const url of [
    '/index.md',
    '/llms.md',
    '/docs/llms.txt',
    ...routed.map((p) => `/${twinPath(p.slug)}`),
  ]) {
    assert.equal(resolveSwaRewrite(config, url), null, `${url} is rewritten`);
  }
});
