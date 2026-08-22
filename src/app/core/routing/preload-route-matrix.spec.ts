import { Routes } from '@angular/router';

import { appRoutes } from '../../app-routing.module';

/**
 * Preloading is opt-in per route. This spec pins *which* routes opt in, so
 * adding `data: { preload: true }` to a new feature is a deliberate, reviewed
 * decision rather than something that quietly accretes until every chunk is
 * being fetched again.
 */
describe('preload route matrix', () => {
  /** The sections a signed-in user reaches first and most often. */
  const PRELOADED = ['prints', 'materials', 'printers'];

  function preloads(route: Routes[number] | undefined): boolean {
    return route?.data?.['preload'] === true;
  }

  it('flags exactly the core three sections', () => {
    const flagged = appRoutes
      .filter((route) => preloads(route))
      .map((route) => route.path)
      .sort();

    expect(flagged).toEqual([...PRELOADED].sort());
  });

  it('only ever flags routes that actually have a chunk to fetch', () => {
    for (const route of appRoutes.filter((r) => preloads(r))) {
      expect(!!(route.loadChildren || route.loadComponent))
        .withContext(`${route.path} is flagged but is not lazily loaded`)
        .toBe(true);
    }
  });

  it('leaves the heavy secondary sections on demand', () => {
    // docs, analytics and subscription are large and rarely the first stop.
    for (const path of ['docs', 'analytics', 'subscription', 'feed']) {
      const route = appRoutes.find((r) => r.path === path);
      expect(preloads(route)).withContext(path).toBe(false);
    }
  });
});
