import { TestBed } from '@angular/core/testing';

import { AdsenseLoaderService } from './adsense-loader.service';

describe('AdsenseLoaderService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  afterEach(() => {
    document
      .querySelectorAll('script[data-adsense-loader]')
      .forEach((el) => el.remove());
  });

  it('should be created', () => {
    expect(TestBed.inject(AdsenseLoaderService)).toBeTruthy();
  });

  it('injects the AdSense loader once and is idempotent', () => {
    const service = TestBed.inject(AdsenseLoaderService);
    service.load();
    service.load();
    const scripts = Array.from(
      document.querySelectorAll('script[data-adsense-loader]')
    );
    expect(scripts.length).toBe(1);
    expect(scripts[0].getAttribute('data-ad-client')).toBe(
      'ca-pub-7759478851543974'
    );
    expect(scripts[0].getAttribute('src')).toContain('adsbygoogle.js');
  });
});
