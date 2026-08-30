import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManifest } from './docs-manifest-lib.mjs';
import {
  emitDeclarationsTs,
  emitFiguresTs,
  emitOutlineTs,
  emitPageComponentTs,
  emitPageTemplate,
  emitRoutesTs,
  emitSearchIndexJson,
  emitServerRoutesTs,
  outlineOf,
} from './docs-emit.mjs';

const page = (over = {}) => ({
  slug: 'prints',
  title: 'Tracking Prints | 3D Print Log Docs',
  description: 'Log every 3D print with photos, filament usage, and settings.',
  navLabel: 'Prints',
  group: 'features',
  order: 10,
  mode: 'how-to',
  updated: '2026-08-28',
  ...over,
});

test('a generated page component is declared, not standalone, so it keeps module scope', () => {
  // A routed standalone component would not inherit RouterModule/MatIcon from
  // DocumentationModule, and strictTemplates turns that into a build error.
  const ts = emitPageComponentTs(buildManifest([page()]).pages[0]);

  assert.match(ts, /standalone: false/);
  assert.match(ts, /changeDetection: ChangeDetectionStrategy\.OnPush/);
  assert.match(ts, /selector: 'app-docs-prints'/);
  assert.match(ts, /export class DocsPrintsComponent \{\s*\}/);
});

test('a generated page component points at its generated template', () => {
  const ts = emitPageComponentTs(buildManifest([page()]).pages[0]);
  assert.match(ts, /templateUrl: '\.\/docs-prints\.component\.html'/);
});

test('frontmatter constants become readonly fields the template can interpolate', () => {
  const ts = emitPageComponentTs(
    buildManifest([
      page({
        slug: 'mcp',
        navLabel: 'MCP',
        group: 'integrations',
        constants: { mcpEndpoint: 'https://api.3dprintlog.com/mcp' },
      }),
    ]).pages[0]
  );

  assert.match(
    ts,
    /public readonly mcpEndpoint = 'https:\/\/api\.3dprintlog\.com\/mcp';/
  );
});

test('a constant derived from other constants is emitted as written', () => {
  const ts = emitPageComponentTs(
    buildManifest([
      page({
        slug: 'mcp',
        navLabel: 'MCP',
        group: 'integrations',
        constants: {
          mcpEndpoint: 'https://api.3dprintlog.com/mcp',
          claudeCodeCommand: '${this.mcpEndpoint} --callback-port 8400',
        },
      }),
    ]).pages[0]
  );

  assert.match(
    ts,
    /public readonly claudeCodeCommand = `\$\{this\.mcpEndpoint\} --callback-port 8400`;/
  );
});

test('a single quote in a constant is escaped rather than closing the string', () => {
  const ts = emitPageComponentTs(
    buildManifest([page({ constants: { note: "it's fine" } })]).pages[0]
  );

  assert.match(ts, /public readonly note = 'it\\'s fine';/);
});

test('no component is emitted for a page that supplies its own', () => {
  const built = buildManifest([
    page({
      component: {
        className: 'DocsGettingStartedComponent',
        path: './docs/docs-getting-started/docs-getting-started.component',
      },
    }),
  ]).pages[0];

  assert.equal(emitPageComponentTs(built), null);
});

test('docs.routes.ts imports each component and lists the routes in order', () => {
  const ts = emitRoutesTs(buildManifest([page({ aliases: ['old-prints'] })]));

  assert.match(
    ts,
    /import \{ DocsPrintsComponent \} from '\.\/pages\/docs-prints\.component';/
  );
  assert.match(ts, /\{ path: 'prints', component: DocsPrintsComponent \}/);
  assert.match(ts, /\{ path: 'old-prints', redirectTo: 'prints' \}/);
  assert.match(
    ts,
    /\{ path: '', redirectTo: 'getting-started', pathMatch: 'full' \}/
  );
});

test('docs.routes.ts imports a hand-written component from its own path', () => {
  const ts = emitRoutesTs(
    buildManifest([
      page({
        slug: 'getting-started',
        group: 'start',
        navLabel: 'Getting Started',
        component: {
          className: 'DocsGettingStartedComponent',
          path: '../docs/docs-getting-started/docs-getting-started.component',
        },
      }),
    ])
  );

  assert.match(
    ts,
    /import \{ DocsGettingStartedComponent \} from '\.\.\/docs\/docs-getting-started\/docs-getting-started\.component';/
  );
});

test('docs.server-routes.ts exports prerender entries only, with no catch-all', () => {
  // app.routes.server.ts appends { path: '**' } structurally, so it can never be
  // shadowed by a generated entry.
  const ts = emitServerRoutesTs(buildManifest([page({ aliases: ['old'] })]));

  assert.match(
    ts,
    /\{ path: 'docs\/prints', renderMode: RenderMode\.Prerender \}/
  );
  assert.doesNotMatch(ts, /\*\*/);
  assert.doesNotMatch(ts, /docs\/old/);
});

test('the search index carries the plain text of each section, not its markup', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<h2>Prints</h2>\n<p>Log a <strong>print</strong>.</p>',
    })
  );

  assert.deepEqual(index, [
    {
      id: 'docs/prints::0',
      path: 'docs/prints',
      url: '/docs/prints',
      title: 'Prints',
      page: 'Prints',
      group: 'features',
      text: 'Log a print.',
    },
  ]);
});

test('the search index deep-links a section whose heading declares an anchor', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<h3 id="usage">Usage</h3>\n<p>How to log one.</p>',
    })
  );

  assert.equal(index[0].url, '/docs/prints#usage');
  assert.equal(index[0].title, 'Usage');
});

test('the search index cuts one entry per h1-h3 heading', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: [
        '<h2 id="a">First</h2>',
        '<p>Alpha.</p>',
        '<h3 id="b">Second</h3>',
        '<p>Beta.</p>',
      ].join('\n'),
    })
  );

  assert.deepEqual(
    index.map((s) => [s.title, s.text]),
    [
      ['First', 'Alpha.'],
      ['Second', 'Beta.'],
    ]
  );
});

test('the search index keeps h4 and deeper inside their parent section', () => {
  // "Full List of Changes:" sits under all 99 releases. Cutting on it would
  // mint 99 sections whose titles say nothing about what they contain.
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: [
        '<h3 id="v1">1.0.0 - Spool Photos</h3>',
        '<p>Summary.</p>',
        '<h4>Full List of Changes:</h4>',
        '<p>Detail.</p>',
      ].join('\n'),
    })
  );

  assert.equal(index.length, 1);
  assert.equal(index[0].title, '1.0.0 - Spool Photos');
  assert.match(index[0].text, /Detail\./);
});

test('the search index titles a pre-heading lead with the page nav label', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<p>Intro prose.</p>\n<h2 id="a">First</h2>\n<p>Alpha.</p>',
    })
  );

  assert.deepEqual(
    index.map((s) => [s.title, s.text]),
    [
      ['Prints', 'Intro prose.'],
      ['First', 'Alpha.'],
    ]
  );
});

test('the search index gives every section a unique id', () => {
  // Two headings can share a title, and most declare no anchor at all, so the
  // id cannot be derived from either.
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<h2>Setup</h2>\n<p>One.</p>\n<h2>Setup</h2>\n<p>Two.</p>',
    })
  );

  assert.equal(new Set(index.map((s) => s.id)).size, index.length);
});

test('commented-out markup reaches none of the projections', () => {
  // `<[^>]+>` stops at the first `>`, so a comment wrapping a tag used to lose
  // the tag and keep the prose and the trailing `-->` as searchable text.
  const template = [
    '<h2>Setup</h2>',
    '<!--',
    '<h3 id="retired">Retired step</h3>',
    '<img src="/assets/img/docs/old.png" alt="Old screen" />',
    'Install the deprecated plugin.',
    '-->',
    '<p>Install the plugin.</p>',
  ].join('\n');

  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), { prints: template })
  );

  assert.equal(index[0].title, 'Setup');
  assert.equal(index[0].text, 'Install the plugin.');
  assert.equal(
    index.length,
    1,
    'the commented-out heading must not open a section'
  );
  assert.doesNotMatch(
    emitFiguresTs(buildManifest([page()]), { prints: template }),
    /old\.png/
  );
});

test('the search index holds the code samples a reader searches for', () => {
  // `--callback-port` matched nothing while <pre> was stripped, which is most
  // of the point of searching an integration page.
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints:
        '<p>Run this:</p><pre><code>claude mcp add --callback-port 8400</code></pre>',
    })
  );

  assert.match(index[0].text, /claude mcp add --callback-port 8400/);
});

test('the search index substitutes the constants a template interpolates', () => {
  // The reader sees the value, so the index has to hold the value: storing the
  // binding left the endpoint unsearchable and showed `{{ mcpEndpoint }}` in
  // any excerpt that covered it.
  const index = JSON.parse(
    emitSearchIndexJson(
      buildManifest([
        page({
          constants: { mcpEndpoint: 'https://api.3dprintlog.com/mcp' },
        }),
      ]),
      { prints: '<p>Point it at {{ mcpEndpoint }} to connect.</p>' }
    )
  );

  assert.equal(
    index[0].text,
    'Point it at https://api.3dprintlog.com/mcp to connect.'
  );
});

test('a constant that references a sibling resolves through to the value', () => {
  const index = JSON.parse(
    emitSearchIndexJson(
      buildManifest([
        page({
          constants: {
            endpoint: 'https://api.3dprintlog.com/mcp',
            command: 'claude mcp add ${this.endpoint} --callback-port 8400',
          },
        }),
      ]),
      { prints: '<pre><code>{{ command }}</code></pre>' }
    )
  );

  assert.equal(
    index[0].text,
    'claude mcp add https://api.3dprintlog.com/mcp --callback-port 8400'
  );
});

test('an interpolated string literal is indexed as the literal it renders', () => {
  // Authors wrap a sample in one when the sample itself contains braces; the
  // Klipper page's Moonraker config is Jinja.
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: `<pre><code>{{'
[notifier 3d_print_log]
events: *
'}}</code></pre>`,
    })
  );

  assert.match(index[0].text, /\[notifier 3d_print_log\] events: \*/);
  assert.doesNotMatch(index[0].text, /[{}]{2}/);
});

test('a binding with no matching constant is left as authored', () => {
  // Emptying it would hide the typo; leaving it keeps the mistake visible.
  const index = JSON.parse(
    emitSearchIndexJson(
      buildManifest([page({ constants: { endpoint: 'https://example.com' } })]),
      { prints: '<p>Use {{ notAConstant }} here.</p>' }
    )
  );

  assert.equal(index[0].text, 'Use {{ notAConstant }} here.');
});

test('an escaped brace is shown, not treated as a binding', () => {
  // `&#123;` is what an author writes to SHOW a brace. Resolving bindings after
  // the decode step would substitute into text that escaped itself on purpose.
  const index = JSON.parse(
    emitSearchIndexJson(
      buildManifest([page({ constants: { endpoint: 'https://example.com' } })]),
      { prints: '<p>Write &#123;&#123; endpoint &#125;&#125; to bind it.</p>' }
    )
  );

  assert.equal(index[0].text, 'Write {{ endpoint }} to bind it.');
});

test('the search index decodes the character references the renderer emits', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints:
        '<p>What it can&rsquo;t do &mdash; say &ldquo;log it&rdquo; to hi&#64;example.com.</p>',
    })
  );

  assert.equal(
    index[0].text,
    'What it can’t do — say “log it” to hi@example.com.'
  );
});

test('search text does not double-unescape an escaped numeric reference', () => {
  // `&amp;#64;` is an authored literal `&#64;`, not an `@`.
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<p>Write &amp;#64; to show the escape.</p>',
    })
  );

  assert.equal(index[0].text, 'Write &#64; to show the escape.');
});

test('the figures manifest lists the images each page references', () => {
  const ts = emitFiguresTs(buildManifest([page()]), {
    prints: '<p><img src="/assets/img/docs/prints.png" alt="Print list" /></p>',
  });

  assert.match(ts, /'docs\/prints': \[/);
  assert.match(ts, /src: '\/assets\/img\/docs\/prints\.png'/);
  assert.match(ts, /alt: 'Print list'/);
});

test('every generated file warns against editing it by hand', () => {
  const m = buildManifest([page()]);
  for (const ts of [
    emitPageComponentTs(m.pages[0]),
    emitRoutesTs(m),
    emitServerRoutesTs(m),
    emitFiguresTs(m, { prints: '' }),
  ]) {
    assert.match(ts, /DO NOT EDIT/);
  }
});

test('a page with a stylesheet gets styleUrls; one without gets none', () => {
  const withStyles = emitPageComponentTs(
    buildManifest([page({ hasStyles: true })]).pages[0]
  );
  const without = emitPageComponentTs(buildManifest([page()]).pages[0]);

  assert.match(withStyles, /styleUrls: \['\.\/docs-prints\.component\.scss'\]/);
  assert.doesNotMatch(without, /styleUrls/);
});

test('the declarations barrel lists every generated page component', () => {
  const ts = emitDeclarationsTs(
    buildManifest([
      page(),
      page({ slug: 'about', navLabel: 'About', group: 'about' }),
    ])
  );

  assert.match(
    ts,
    /import \{ DocsPrintsComponent \} from '\.\/pages\/docs-prints\.component';/
  );
  assert.match(ts, /export const DOCS_PAGE_COMPONENTS = \[/);
  assert.match(ts, /DocsPrintsComponent,/);
  assert.match(ts, /DocsAboutComponent,/);
});

test('the declarations barrel omits a hand-written component, which declares itself', () => {
  // DocumentationModule already declares it; declaring it twice is a compile error.
  const ts = emitDeclarationsTs(
    buildManifest([
      page({ component: { className: 'DocsPrintsComponent', path: '../x' } }),
    ])
  );

  assert.doesNotMatch(ts, /DocsPrintsComponent/);
});

test('the declarations barrel omits a dormant page', () => {
  const ts = emitDeclarationsTs(
    buildManifest([page({ slug: 'terms', navLabel: 'Terms', dormant: true })])
  );

  assert.doesNotMatch(ts, /DocsTermsComponent/);
});

// The pre-Markdown components each opened with `<div class="docs-markdown">`.
// styles.scss hangs the docs body font size and min-height off that class, and
// docs-getting-started.component.scss hangs its max-width and centering off it,
// so a page emitted without the wrapper silently loses its layout.
test('emitPageTemplate wraps the page in the docs-markdown container', () => {
  const html = emitPageTemplate('<h2>Prints</h2>');

  assert.ok(
    html.endsWith('<div class="docs-markdown">\n<h2>Prints</h2>\n</div>\n')
  );
});

test('emitPageTemplate keeps the generated banner outside the wrapper', () => {
  const html = emitPageTemplate('<p>Body</p>');

  assert.equal(html.indexOf('<!-- DO NOT EDIT'), 0);
  assert.ok(html.indexOf('docs-markdown') > html.indexOf('DO NOT EDIT'));
});

// `literal` emits an interpolated constant as a backtick template so `${...}`
// survives. A backslash left unescaped in that branch is read as a JS escape,
// and a trailing one consumes the closing backtick.
test('a backslash in an interpolated constant cannot escape the closing backtick', () => {
  const ts = emitPageComponentTs(
    buildManifest([
      page({
        constants: {
          root: 'C:\\logs',
          command: 'copy C:\\out\\ ${this.root}',
        },
      }),
    ]).pages[0]
  );

  assert.ok(
    ts.includes('public readonly command = `copy C:\\\\out\\\\ ${this.root}`;'),
    ts
  );
});

// Unescaping `&amp;` before the other references turns an authored `&amp;lt;`
// into `&lt;` and then into `<`, inventing markup the source escaped on purpose.
test('search text does not double-unescape an escaped character reference', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<p>Write &amp;lt;tag&amp;gt; to show a tag.</p>',
    })
  );

  assert.equal(index[0].text, 'Write &lt;tag&gt; to show a tag.');
});

test('the outline drops a lone leading heading as the page title', () => {
  // "## Printers" repeats the nav label and the <h1> above the rail. Listing
  // it as the first TOC entry is a link to what the reader is already at.
  const outline = outlineOf(
    [
      '<h2 id="printers">Printers</h2>',
      '<h3 id="printers-list">Printers List</h3>',
      '<h3 id="add">Add a Printer</h3>',
    ].join('\n')
  );

  assert.deepEqual(
    outline.map((h) => h.id),
    ['printers-list', 'add']
  );
});

test('the outline keeps every heading when the shallowest level has peers', () => {
  // The privacy policy is nine <h2> sections under an <h1> title. None of them
  // is a title, and dropping the first would silently lose a section.
  const outline = outlineOf(
    [
      '<h2 id="what-we-collect">What We Collect</h2>',
      '<h2 id="how-we-use-it">How We Use It</h2>',
      '<h2 id="contact">Contact</h2>',
    ].join('\n')
  );

  assert.equal(outline.length, 3);
});

test('the outline normalizes depth relative to the shallowest section', () => {
  // A page whose sections are h3 and one whose sections are h2 both start the
  // rail at depth 1, so one indent step means the same thing on every page.
  const nested = outlineOf(
    [
      '<h2 id="title">Prints</h2>',
      '<h3 id="add">Add</h3>',
      '<h4 id="usage">Material Usage</h4>',
    ].join('\n')
  );

  assert.deepEqual(nested, [
    { id: 'add', text: 'Add', depth: 1 },
    { id: 'usage', text: 'Material Usage', depth: 2 },
  ]);
});

test('the outline skips a heading with no id, which is not linkable', () => {
  const outline = outlineOf(
    ['<h2 id="t">T</h2>', '<h3>No Id</h3>', '<h3 id="yes">Yes</h3>'].join('\n')
  );

  assert.deepEqual(
    outline.map((h) => h.id),
    ['yes']
  );
});

test('the outline takes a heading as the reader reads it, markup dropped', () => {
  const outline = outlineOf(
    ['<h2 id="t">T</h2>', '<h3 id="a">Add a <strong>Print</strong></h3>'].join(
      '\n'
    )
  );

  assert.equal(outline[0].text, 'Add a Print');
});

test('the outline ignores headings inside a comment', () => {
  const outline = outlineOf(
    [
      '<h2 id="t">T</h2>',
      '<!-- <h3 id="draft">Draft</h3> -->',
      '<h3 id="live">Live</h3>',
    ].join('\n')
  );

  assert.deepEqual(
    outline.map((h) => h.id),
    ['live']
  );
});

test('the release notes page gets no outline', () => {
  // It paints ten releases and lazily imports the other ninety-odd, so most of
  // its headings are not in the DOM to scroll to.
  const ts = emitOutlineTs(
    buildManifest([page(), page({ slug: 'release-notes', order: 20 })]),
    {
      prints: '<h2 id="t">Prints</h2><h3 id="add">Add</h3>',
      'release-notes': '<h3 id="v1.0.0">1.0.0</h3>',
    }
  );

  assert.match(ts, /'docs\/prints'/);
  assert.doesNotMatch(ts, /release-notes/);
});

test('the emitted outline escapes an apostrophe in a heading', () => {
  const ts = emitOutlineTs(buildManifest([page()]), {
    prints: "<h2 id=\"t\">Prints</h2><h3 id=\"g\">What You'll Get</h3>",
  });

  assert.match(ts, /text: 'What You\\'ll Get'/);
});
