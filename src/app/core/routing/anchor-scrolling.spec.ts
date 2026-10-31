import type { MockedObject } from 'vitest';
import { ViewportScroller } from '@angular/common';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideAppRouter } from '../../app.routes';

@Component({ template: '' })
class PageComponent {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class RootComponent {}

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
 * tests of the pages themselves, so it is asserted here, through the router the
 * app actually provides.
 */
describe('router scrolling configuration', () => {
  let scroller: MockedObject<ViewportScroller>;
  let host: HTMLElement;

  const navigate = async (url: string) => {
    await TestBed.inject(Router).navigateByUrl(url);
    // The router hands the scroll to the viewport after the navigation settles.
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  beforeEach(() => {
    scroller = {
      scrollToAnchor: vi.fn().mockName('ViewportScroller.scrollToAnchor'),
      scrollToPosition: vi.fn().mockName('ViewportScroller.scrollToPosition'),
      getScrollPosition: vi.fn().mockName('ViewportScroller.getScrollPosition'),
      setHistoryScrollRestoration: vi
        .fn()
        .mockName('ViewportScroller.setHistoryScrollRestoration'),
      setOffset: vi.fn().mockName('ViewportScroller.setOffset'),
    };
    scroller.getScrollPosition.mockReturnValue([0, 0]);

    TestBed.configureTestingModule({
      providers: [
        provideAppRouter([
          { path: 'one', component: PageComponent },
          { path: 'two', component: PageComponent },
        ]),
        { provide: ViewportScroller, useValue: scroller },
      ],
    });

    // The router starts its scroller from a bootstrap listener, so the spec
    // bootstraps a root component the way the app does.
    host = document.createElement('div');
    document.body.appendChild(host);
    TestBed.inject(ApplicationRef).bootstrap(RootComponent, host);
  });

  afterEach(() => host.remove());

  it('scrolls to the anchor a URL fragment names', async () => {
    await navigate('/one#install');

    expect(scroller.scrollToAnchor).toHaveBeenCalledWith('install');
  });

  it('still restores scroll position for navigations with no fragment', async () => {
    await navigate('/one');
    scroller.scrollToPosition.mockClear();

    await navigate('/two');

    expect(scroller.scrollToPosition).toHaveBeenCalledWith([0, 0]);
  });
});
