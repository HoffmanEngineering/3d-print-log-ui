import { TestBed } from '@angular/core/testing';

import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { GoogleAnalyticsService } from './google-analytics.service';
import { environment } from 'src/environments/environment';

describe('GoogleAnalyticsService', () => {
  let events$: Subject<NavigationEnd>;

  function configure(): GoogleAnalyticsService {
    events$ = new Subject<NavigationEnd>();
    const routerMock = { events: events$.asObservable() } as unknown as Router;
    TestBed.configureTestingModule({
      providers: [
        GoogleAnalyticsService,
        { provide: Router, useValue: routerMock },
      ],
    });
    return TestBed.inject(GoogleAnalyticsService);
  }

  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it('should be created', () => {
    expect(configure()).toBeTruthy();
  });

  it('sends a GA4 config pageview on NavigationEnd', () => {
    const gtagSpy = jasmine.createSpy('gtag');
    (window as unknown as { gtag: unknown }).gtag = gtagSpy;

    configure();
    events$.next(new NavigationEnd(1, '/prints', '/prints'));

    expect(gtagSpy).toHaveBeenCalledWith(
      'config',
      environment.googleAnalyticsMeasurementId,
      { page_path: '/prints' }
    );
  });

  it('does not throw on NavigationEnd when gtag is unavailable', () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    configure();
    expect(() =>
      events$.next(new NavigationEnd(1, '/prints', '/prints'))
    ).not.toThrow();
  });

  it('does not throw from eventEmitter when gtag is unavailable', () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    const service = configure();
    expect(() => service.eventEmitter('name', 'cat', 'action')).not.toThrow();
  });

  it('does not throw from emitConversion when gtag is unavailable', () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    const service = configure();
    expect(() => service.emitConversion('AW-000/abc')).not.toThrow();
  });
});
