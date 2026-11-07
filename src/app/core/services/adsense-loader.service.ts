import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IS_CORDOVA_IOS } from '../utils/platform';
import { AD_CLIENT } from '../../shared/ad/ad-slots';

/** adsbygoogle.js sets `loaded` on its queue once it has run. */
type AdWindow = Window & { adsbygoogle?: { loaded?: boolean } };

/**
 * Injects the Google AdSense loader script on demand. Deferring the loader out
 * of the initial page load keeps the home page eligible for the back/forward
 * cache (the loader registers an unload handler), removes the unload
 * deprecation warning, and cuts Total Blocking Time. Callers trigger `load()`
 * after first paint / first user interaction.
 *
 * Never in the iOS app (#366): the loader tracks even with no ad slot on the page, which
 * would put the app under Apple's App Tracking Transparency rules.
 */
@Injectable({ providedIn: 'root' })
export class AdsenseLoaderService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isCordovaIos = inject(IS_CORDOVA_IOS);
  private loaded = false;
  private readonly _ready = signal(false);
  /**
   * True once adsbygoogle.js has run. Ad slots push only then: a push queued before the
   * script runs is applied later to whatever `<ins>` is on the page by that time, so a slot
   * the user has already navigated away from left one push too many ("All 'ins' elements
   * in the DOM with class=adsbygoogle already have ads in them"). Stays false when the
   * script is blocked (an ad blocker), and then no slot pushes at all.
   */
  readonly ready = this._ready.asReadonly();

  load(): void {
    if (!this.isBrowser || this.isCordovaIos || this.loaded) return;
    this.loaded = true;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-adsense-loader]'
    );
    if (existing) {
      if ((window as AdWindow).adsbygoogle?.loaded) {
        this._ready.set(true);
      } else {
        this.markReadyOnLoad(existing);
      }
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-ad-client', AD_CLIENT);
    script.setAttribute('data-adsense-loader', '');
    this.markReadyOnLoad(script);
    document.head.appendChild(script);
  }

  private markReadyOnLoad(script: HTMLScriptElement): void {
    script.addEventListener('load', () => this._ready.set(true), {
      once: true,
    });
  }
}
