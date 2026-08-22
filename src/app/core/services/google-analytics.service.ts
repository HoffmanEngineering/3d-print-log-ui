import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(public router: Router) {
    if (!this.isBrowser) return;
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.gtag('config', environment.googleAnalyticsMeasurementId, {
          page_path: event.urlAfterRedirects,
        });
      }
    });
  }

  public eventEmitter(
    eventName: string,
    eventCategory: string,
    eventAction: string,
    eventLabel: string | null = null,
    eventValue: number | null = null
  ) {
    this.gtag('event', eventName, {
      eventCategory,
      eventLabel,
      eventAction,
      eventValue,
    });
  }

  public emitConversion(sendTo: string) {
    this.gtag('event', 'conversion', { send_to: sendTo });
  }

  /**
   * Resolve the global gtag off `window` and no-op when it is absent, so a
   * missing/not-yet-loaded gtag bootstrap never throws a ReferenceError.
   */
  private gtag(...args: unknown[]): void {
    if (!this.isBrowser) return;
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      w.gtag(...args);
    }
  }
}
