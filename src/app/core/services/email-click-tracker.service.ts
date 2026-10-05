import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';

import { LoggingService } from './logging.service';

/**
 * Counts arrivals from email links and then tidies the address bar.
 *
 * Every link in an email carries `utm_source=email`, `utm_campaign` and `utm_content`. On the
 * first navigation this logs `Email_Clicked` and replaces the URL without the `utm_*`
 * parameters, so they are not bookmarked, shared or counted twice on reload.
 *
 * The address bar is rewritten in place rather than through the router: a router navigation
 * would fire another `NavigationEnd` and so another analytics page view. It starts from the live
 * `location`, not the router's URL, so it keeps whatever the page has already done to the
 * fragment — on /email-preferences that fragment is a token the page strips as it loads.
 */
@Injectable({
  providedIn: 'root',
})
export class EmailClickTrackerService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly logging = inject(LoggingService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Checks the URL the app was opened with, once the first navigation settles. */
  start(): void {
    if (!this.isBrowser) {
      return;
    }
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        take(1)
      )
      .subscribe((e) => this.trackFromUrl(e.urlAfterRedirects));
  }

  trackFromUrl(url: string): void {
    if (!this.isBrowser) {
      return;
    }

    const tree = this.router.parseUrl(url);
    const params = tree.queryParams;
    if (params['utm_source'] !== 'email') {
      return;
    }

    this.logging.logEvent('Email_Clicked', {
      campaign: params['utm_campaign'] ?? '',
      content: params['utm_content'] ?? '',
    });

    const location = this.document.location;
    const search = new URLSearchParams(location.search);
    for (const key of [...search.keys()]) {
      if (key.startsWith('utm_')) {
        search.delete(key);
      }
    }
    const query = search.toString();
    this.document.defaultView?.history.replaceState(
      this.document.defaultView.history.state,
      '',
      location.pathname + (query ? `?${query}` : '') + location.hash
    );
  }
}
