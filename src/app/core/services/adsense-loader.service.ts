import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Injects the Google AdSense loader script on demand. Deferring the loader out
 * of the initial page load keeps the home page eligible for the back/forward
 * cache (the loader registers an unload handler), removes the unload
 * deprecation warning, and cuts Total Blocking Time. Callers trigger `load()`
 * after first paint / first user interaction.
 */
@Injectable({ providedIn: 'root' })
export class AdsenseLoaderService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private loaded = false;

  load(): void {
    if (!this.isBrowser || this.loaded) return;
    if (document.querySelector('script[data-adsense-loader]')) {
      this.loaded = true;
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-ad-client', 'ca-pub-7759478851543974');
    script.setAttribute('data-adsense-loader', '');
    document.head.appendChild(script);
    this.loaded = true;
  }
}
