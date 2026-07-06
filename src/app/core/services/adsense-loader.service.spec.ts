import { TestBed } from '@angular/core/testing';

import { AdsenseLoaderService } from './adsense-loader.service';

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
    const appendSpy = spyOn(document.head, 'appendChild').and.callFake(
      <T extends Node>(node: T): T => node
    );

    const service = TestBed.inject(AdsenseLoaderService);
    service.load();
    service.load();

    expect(appendSpy).toHaveBeenCalledTimes(1);
    const script = appendSpy.calls.argsFor(0)[0] as HTMLScriptElement;
    expect(script.getAttribute('data-ad-client')).toBe(
      'ca-pub-7759478851543974'
    );
    expect(script.getAttribute('data-adsense-loader')).toBe('');
    expect(script.src).toContain('adsbygoogle.js');
  });
});
