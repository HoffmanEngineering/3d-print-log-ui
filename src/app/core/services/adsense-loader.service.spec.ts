import { TestBed } from '@angular/core/testing';

import { AdsenseLoaderService } from './adsense-loader.service';
import { IS_CORDOVA_IOS } from '../utils/platform';

describe('AdsenseLoaderService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    expect(TestBed.inject(AdsenseLoaderService)).toBeTruthy();
  });

  it('injects the AdSense loader once and is idempotent', () => {
    // Other specs (e.g. AppComponent's interaction listeners, which are not
    // torn down between specs) can leave a real loader <script> in the shared
    // document. That would make load() early-return and break this spec
    // depending on execution order, so start from a clean slate.
    document
      .querySelectorAll('script[data-adsense-loader]')
      .forEach((s) => s.remove());

    // Capture the script element without actually inserting it into the test
    // document — appending a live adsbygoogle.js <script> makes a real network
    // request and starts filling stray ad slots from other specs, which hangs
    // the CI browser.
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => node);

    const service = TestBed.inject(AdsenseLoaderService);
    service.load();
    service.load();

    expect(appendSpy).toHaveBeenCalledTimes(1);
    const script = vi.mocked(appendSpy).mock.calls[0][0] as HTMLScriptElement;
    expect(script.getAttribute('data-ad-client')).toBe(
      'ca-pub-7759478851543974'
    );
    expect(script.getAttribute('data-adsense-loader')).toBe('');
    expect(script.src).toContain('adsbygoogle.js');
  });

  // Slots push only once the script runs, so a push can never outlive the slot that made it.
  it('reports ready only after the script has loaded', () => {
    document
      .querySelectorAll('script[data-adsense-loader]')
      .forEach((s) => s.remove());
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => node);
    const service = TestBed.inject(AdsenseLoaderService);

    expect(service.ready()).toBe(false);
    service.load();
    expect(service.ready()).toBe(false);

    const script = vi.mocked(appendSpy).mock.calls[0][0] as HTMLScriptElement;
    script.dispatchEvent(new Event('load'));
    expect(service.ready()).toBe(true);
  });

  it('stays not ready when the script fails to load (an ad blocker)', () => {
    document
      .querySelectorAll('script[data-adsense-loader]')
      .forEach((s) => s.remove());
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => node);
    const service = TestBed.inject(AdsenseLoaderService);

    service.load();
    const script = vi.mocked(appendSpy).mock.calls[0][0] as HTMLScriptElement;
    script.dispatchEvent(new Event('error'));

    expect(service.ready()).toBe(false);
  });

  it('waits for a loader script that is already on the page', () => {
    document
      .querySelectorAll('script[data-adsense-loader]')
      .forEach((s) => s.remove());
    const existing = document.createElement('script');
    existing.setAttribute('data-adsense-loader', '');
    document.head.appendChild(existing);
    try {
      const service = TestBed.inject(AdsenseLoaderService);
      service.load();
      expect(service.ready()).toBe(false);

      existing.dispatchEvent(new Event('load'));
      expect(service.ready()).toBe(true);
    } finally {
      existing.remove();
    }
  });

  it('never injects the loader in the iOS app', () => {
    document
      .querySelectorAll('script[data-adsense-loader]')
      .forEach((s) => s.remove());
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => node);
    TestBed.overrideProvider(IS_CORDOVA_IOS, { useValue: true });

    TestBed.inject(AdsenseLoaderService).load();

    expect(appendSpy).not.toHaveBeenCalled();
  });
});
