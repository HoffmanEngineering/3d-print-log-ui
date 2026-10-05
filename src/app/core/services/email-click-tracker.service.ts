import { isPlatformBrowser } from '@angular/common';
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
 */
@Injectable({
  providedIn: 'root',
})
export class EmailClickTrackerService {
  private readonly router = inject(Router);
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

    tree.queryParams = Object.fromEntries(
      Object.entries(params).filter(([key]) => !key.startsWith('utm_'))
    );
    void this.router.navigateByUrl(tree, { replaceUrl: true });
  }
}
