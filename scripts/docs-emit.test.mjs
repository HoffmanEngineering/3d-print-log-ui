import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManifest } from './docs-manifest-lib.mjs';
import {
  emitDeclarationsTs,
  emitFiguresTs,
  emitPageComponentTs,
  emitPageTemplate,
  emitRoutesTs,
  emitSearchIndexJson,
  emitServerRoutesTs,
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
  const ts = emitRoutesTs(
    buildManifest([page({ aliases: ['old-prints'] })])
  );

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

test('the search index carries the plain text of each page, not its markup', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<h2>Prints</h2>\n<p>Log a <strong>print</strong>.</p>',
    })
  );

  assert.deepEqual(index, [
    {
      path: 'docs/prints',
      title: 'Tracking Prints | 3D Print Log Docs',
      navLabel: 'Prints',
      group: 'features',
      headings: ['Prints'],
      text: 'Prints Log a print.',
    },
  ]);
});

test('the search index records a heading anchor when the page declares one', () => {
  const index = JSON.parse(
    emitSearchIndexJson(buildManifest([page()]), {
      prints: '<h3 id="usage">Usage</h3>',
    })
  );

  assert.deepEqual(index[0].headings, ['Usage#usage']);
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

  assert.ok(html.endsWith('<div class="docs-markdown">\n<h2>Prints</h2>\n</div>\n'));
});

test('emitPageTemplate keeps the generated banner outside the wrapper', () => {
  const html = emitPageTemplate('<p>Body</p>');

  assert.equal(html.indexOf('<!-- DO NOT EDIT'), 0);
  assert.ok(html.indexOf('docs-markdown') > html.indexOf('DO NOT EDIT'));
});
