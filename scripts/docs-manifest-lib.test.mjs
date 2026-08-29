import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DOC_SLUG,
  buildManifest,
  toChildRoutes,
  toDocRoutes,
  toArticleRoutes,
  toSeo,
  toServerRoutes,
  toSidebar,
} from './docs-manifest-lib.mjs';

const page = (over = {}) => ({
  slug: 'prints',
  title: 'Tracking Prints | 3D Print Log Docs',
  description:
    'Log every 3D print with photos, filament usage, print time, and settings. Learn how to create, edit, and organize prints.',
  navLabel: 'Prints',
  group: 'features',
  order: 10,
  mode: 'how-to',
  updated: '2026-08-28',
  ...over,
});

const manifest = (pages) => buildManifest(pages);

test('orders pages by group order, then page order', () => {
  const m = manifest([
    page({ slug: 'about', group: 'about', order: 10, navLabel: 'About' }),
    page({ slug: 'materials', group: 'features', order: 20, navLabel: 'Materials' }),
    page({ slug: 'prints', group: 'features', order: 10 }),
  ]);

  assert.deepEqual(
    m.pages.map((p) => p.slug),
    ['prints', 'materials', 'about']
  );
});

test('breaks an order tie by slug so generation is deterministic', () => {
  const m = manifest([
    page({ slug: 'zebra', order: 10, navLabel: 'Zebra' }),
    page({ slug: 'alpha', order: 10, navLabel: 'Alpha' }),
  ]);

  assert.deepEqual(
    m.pages.map((p) => p.slug),
    ['alpha', 'zebra']
  );
});

test('records the route path for each page', () => {
  const m = manifest([page()]);
  assert.equal(m.pages[0].path, 'docs/prints');
});

test('rejects an unknown group rather than dropping the page off the sidebar', () => {
  assert.throws(
    () => manifest([page({ group: 'nonsense' })]),
    /unknown group "nonsense"/i
  );
});

test('rejects two pages claiming the same slug', () => {
  assert.throws(() => manifest([page(), page()]), /duplicate slug "prints"/i);
});

test('rejects an alias that collides with a real page slug', () => {
  assert.throws(
    () =>
      manifest([
        page(),
        page({ slug: 'materials', navLabel: 'Materials', aliases: ['prints'] }),
      ]),
    /alias "prints"/i
  );
});

test('rejects the same alias claimed by two pages', () => {
  assert.throws(
    () =>
      manifest([
        page({ aliases: ['old'] }),
        page({ slug: 'materials', navLabel: 'Materials', aliases: ['old'] }),
      ]),
    /alias "old"/i
  );
});

test('child routes carry the component, an alias redirect, and the default route last', () => {
  const routes = toChildRoutes(
    manifest([
      page({ slug: 'materials', navLabel: 'Materials', aliases: ['filaments'] }),
    ])
  );

  assert.deepEqual(routes, [
    { path: 'materials', component: 'DocsMaterialsComponent' },
    { path: 'filaments', redirectTo: 'materials' },
    { path: '', redirectTo: DEFAULT_DOC_SLUG, pathMatch: 'full' },
  ]);
});

test('child routes name a hand-written component when the page opts out', () => {
  const routes = toChildRoutes(
    manifest([
      page({
        slug: 'getting-started',
        navLabel: 'Getting Started',
        group: 'start',
        component: {
          className: 'DocsGettingStartedComponent',
          path: './docs/docs-getting-started/docs-getting-started.component',
        },
      }),
    ])
  );

  assert.equal(routes[0].component, 'DocsGettingStartedComponent');
});

test('server routes prerender every canonical page and no alias', () => {
  const routes = toServerRoutes(
    manifest([page({ aliases: ['old-prints'] })])
  );

  assert.deepEqual(routes, [{ path: 'docs/prints', renderMode: 'Prerender' }]);
});

test('DOC_ROUTES holds canonical paths only, excluding aliases', () => {
  assert.deepEqual(toDocRoutes(manifest([page({ aliases: ['old'] })])), [
    'docs/prints',
  ]);
});

test('DOC_ROUTES excludes a dormant page that is not routed', () => {
  assert.deepEqual(
    toDocRoutes(
      manifest([page(), page({ slug: 'terms', navLabel: 'Terms', dormant: true })])
    ),
    ['docs/prints']
  );
});

test('a dormant page gets no child route and no server route', () => {
  const m = manifest([page({ slug: 'terms', navLabel: 'Terms', dormant: true })]);

  assert.deepEqual(toServerRoutes(m), []);
  assert.deepEqual(toChildRoutes(m), [
    { path: '', redirectTo: DEFAULT_DOC_SLUG, pathMatch: 'full' },
  ]);
});

test('the article set is every page verify-prerender expects TechArticle on', () => {
  // verify-prerender.mjs derives this from DOC_ROUTES, so the two must agree.
  const m = manifest([page(), page({ slug: 'about', navLabel: 'About', group: 'about' })]);
  assert.deepEqual(toArticleRoutes(m), toDocRoutes(m));
});

test('the article set tracks the sitemap when a page is added', () => {
  // There is no structured-data opt-out: the docs shell emits TechArticle and
  // BreadcrumbList for every route that resolves SEO tags, so a flag that
  // removed a page from this projection alone would just disagree with the
  // page the browser actually renders.
  const m = manifest([
    page(),
    page({ slug: 'about', navLabel: 'About', group: 'about' }),
    page({ slug: 'retired', navLabel: 'Retired', group: 'about', dormant: true }),
  ]);

  assert.deepEqual(toArticleRoutes(m), toDocRoutes(m));
  assert.deepEqual(toArticleRoutes(m), ['docs/prints', 'docs/about']);
});

test('SEO is keyed by route path and carries title and description', () => {
  assert.deepEqual(toSeo(manifest([page()])), {
    'docs/prints': {
      title: 'Tracking Prints | 3D Print Log Docs',
      description: page().description,
    },
  });
});

test('the sidebar lists pages in order with a divider between groups', () => {
  const nav = toSidebar(
    manifest([
      page({ slug: 'getting-started', navLabel: 'Getting Started', group: 'start', order: 10 }),
      page({ slug: 'prints', navLabel: 'Prints', group: 'features', order: 10 }),
      page({ slug: 'materials', navLabel: 'Materials', group: 'features', order: 20 }),
    ])
  );

  assert.deepEqual(nav, [
    { name: 'Getting Started', url: '/docs/getting-started' },
    { divider: true },
    { name: 'Prints', url: '/docs/prints' },
    { name: 'Materials', url: '/docs/materials' },
  ]);
});

test('the sidebar omits a dormant page', () => {
  const nav = toSidebar(
    manifest([page(), page({ slug: 'terms', navLabel: 'Terms', dormant: true })])
  );

  assert.deepEqual(nav, [{ name: 'Prints', url: '/docs/prints' }]);
});

test('derives a component class name and selector from the slug', () => {
  const m = manifest([page({ slug: 'octoprint-webhook', navLabel: 'OctoPrint' })]);

  assert.equal(m.pages[0].className, 'DocsOctoprintWebhookComponent');
  assert.equal(m.pages[0].selector, 'app-docs-octoprint-webhook');
});

// --- findings from the second adversarial review ----------------------------

// An alias becomes a route path verbatim. An empty one produces
// `{ path: '', redirectTo: <page> }`, which is emitted BEFORE the default route
// and therefore shadows it -- /docs would land on the wrong page.
test('rejects an empty alias', () => {
  assert.throws(
    () => manifest([page({ aliases: [''] })]),
    /must be a non-empty string/
  );
});

test('rejects a non-string alias', () => {
  assert.throws(
    () => manifest([page({ aliases: [42] })]),
    /must be a non-empty string/
  );
});

