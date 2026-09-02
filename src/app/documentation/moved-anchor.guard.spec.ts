import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { docsAliasRedirect, movedAnchorGuard } from './moved-anchor.guard';

@Component({ template: 'materials' })
class MaterialsStubComponent {}

@Component({ template: 'reference' })
class ReferenceStubComponent {}

/**
 * Mirrors the shape scripts/docs-emit.mjs emits. The emitter tests assert the
 * same three properties, so a drift here shows up there too.
 */
const routes: Routes = [
  {
    path: 'docs',
    children: [
      {
        path: 'materials',
        component: MaterialsStubComponent,
        canActivate: [movedAnchorGuard],
        runGuardsAndResolvers: 'always',
      },
      {
        path: 'materials-reference',
        component: ReferenceStubComponent,
        canActivate: [movedAnchorGuard],
        runGuardsAndResolvers: 'always',
      },
      { path: 'filaments', redirectTo: docsAliasRedirect('materials') },
    ],
  },
];

describe('movedAnchorGuard', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    router = TestBed.inject(Router);
  });

  it('leaves an unmoved fragment alone', async () => {
    await RouterTestingHarness.create('/docs/materials#qr-labels');
    expect(router.url).toBe('/docs/materials#qr-labels');
  });

  it('leaves a fragment-less navigation alone', async () => {
    await RouterTestingHarness.create('/docs/materials');
    expect(router.url).toBe('/docs/materials');
  });

  it('carries an alias navigation with no fragment to the canonical page', async () => {
    await RouterTestingHarness.create('/docs/filaments');
    expect(router.url).toBe('/docs/materials');
  });

  it('redirects a moved fragment to the page that now declares it', async () => {
    await RouterTestingHarness.create('/docs/materials#add-weights');
    expect(router.url).toBe('/docs/materials-reference#add-weights');
  });

  // The default runGuardsAndResolvers is paramsChange, under which the route is
  // reused and the guard never re-runs. This is the case 'always' buys.
  it('redirects on a fragment-only navigation within the same page', async () => {
    await RouterTestingHarness.create('/docs/materials#qr-labels');
    await router.navigateByUrl('/docs/materials#add-weights');
    expect(router.url).toBe('/docs/materials-reference#add-weights');
  });

  // Angular parses a string redirectTo's fragment off the TARGET, so a plain
  // `redirectTo: 'materials'` would arrive bare and the guard would see nothing.
  it('carries the fragment through an alias redirect', async () => {
    await RouterTestingHarness.create('/docs/filaments#add-weights');
    expect(router.url).toBe('/docs/materials-reference#add-weights');
  });

  // A saved link is as likely to carry a query as a fragment. createUrlTree
  // builds a fresh tree, so anything not passed to it is dropped silently.
  it('carries query parameters through a moved-anchor redirect', async () => {
    await RouterTestingHarness.create(
      '/docs/materials?utm_source=saved-link#add-weights'
    );
    expect(router.url).toBe(
      '/docs/materials-reference?utm_source=saved-link#add-weights'
    );
  });

  it('carries query parameters through an alias redirect', async () => {
    await RouterTestingHarness.create('/docs/filaments?devUserId=anonymous');
    expect(router.url).toBe('/docs/materials?devUserId=anonymous');
  });

  it('carries both a query and a fragment through both hops', async () => {
    await RouterTestingHarness.create(
      '/docs/filaments?utm_source=saved-link#add-weights'
    );
    expect(router.url).toBe(
      '/docs/materials-reference?utm_source=saved-link#add-weights'
    );
  });
});
