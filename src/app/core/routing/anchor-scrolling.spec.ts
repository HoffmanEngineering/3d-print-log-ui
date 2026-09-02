import { ExtraOptions, ROUTER_CONFIGURATION } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AppRoutingModule } from '../../app-routing.module';

/**
 * Pins the two scrolling options, which only work as a pair.
 *
 * `scrollPositionRestoration: 'enabled'` alone scrolls a fragment navigation
 * back to the top: the router never looks at the `#anchor`, so it treats the
 * arrival as a fresh page and restores position zero. Every deep link into a
 * docs page — a search result, a cross-page anchor, a bookmarked release note —
 * landed at the top of the page instead of at the thing it named.
 *
 * Turning either off silently breaks that again, and it is invisible in unit
 * tests of the pages themselves, so it is asserted here.
 */
describe('router scrolling configuration', () => {
  function options(): ExtraOptions {
    TestBed.configureTestingModule({ imports: [AppRoutingModule] });
    return TestBed.inject(ROUTER_CONFIGURATION);
  }

  it('scrolls to the anchor a URL fragment names', () => {
    expect(options().anchorScrolling).toBe('enabled');
  });

  it('still restores scroll position for navigations with no fragment', () => {
    expect(options().scrollPositionRestoration).toBe('enabled');
  });
});
