import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { EmailClickTrackerService } from './email-click-tracker.service';
import { LoggingService } from './logging.service';

describe('EmailClickTrackerService', () => {
  let logging: jasmine.SpyObj<LoggingService>;
  let replaceState: jasmine.Spy;
  let navigate: jasmine.Spy;

  /** The address bar the service reads, and the history it writes to. */
  function setup(
    href: string,
    platform: 'browser' | 'server' = 'browser'
  ): EmailClickTrackerService {
    const url = new URL(href, 'https://www.3dprintlog.com');
    replaceState = jasmine.createSpy('replaceState');
    const fakeDocument = {
      location: { pathname: url.pathname, search: url.search, hash: url.hash },
      defaultView: { history: { state: { navigationId: 1 }, replaceState } },
    };
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: LoggingService, useValue: logging },
        { provide: DOCUMENT, useValue: fakeDocument },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    return TestBed.inject(EmailClickTrackerService);
  }

  it('logs the click and strips the utm parameters, keeping the rest', () => {
    const url =
      '/analytics?utm_source=email&utm_medium=email&utm_campaign=monthly-recap&utm_content=2026-11&foo=1';
    const service = setup(url);

    service.trackFromUrl(url);

    expect(logging.logEvent).toHaveBeenCalledWith('Email_Clicked', {
      campaign: 'monthly-recap',
      content: '2026-11',
    });
    expect(replaceState).toHaveBeenCalledOnceWith(
      { navigationId: 1 },
      '',
      '/analytics?foo=1'
    );
  });

  it('rewrites the address bar without a router navigation, so no second page view', () => {
    const url = '/analytics?utm_source=email&utm_campaign=x';
    const service = setup(url);

    service.trackFromUrl(url);

    expect(navigate).not.toHaveBeenCalled();
    expect(replaceState.calls.mostRecent().args[2]).toBe('/analytics');
  });

  it('keeps the fragment', () => {
    const url = '/settings?utm_source=email&utm_campaign=onboarding#email';
    const service = setup(url);

    service.trackFromUrl(url);

    expect(replaceState.calls.mostRecent().args[2]).toBe('/settings#email');
  });

  it('does not put back a token fragment the preferences page already removed', () => {
    // The router still remembers the fragment; the live address bar no longer has it.
    const service = setup('/email-preferences?utm_source=email&utm_campaign=x');

    service.trackFromUrl(
      '/email-preferences?utm_source=email&utm_campaign=x#m=SECRET'
    );

    expect(replaceState.calls.mostRecent().args[2]).toBe('/email-preferences');
  });

  it('ignores links that did not come from an email', () => {
    const service = setup('/analytics?foo=1');

    service.trackFromUrl('/analytics?utm_source=newsletter&utm_campaign=x');
    service.trackFromUrl('/analytics?foo=1');

    expect(logging.logEvent).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('does nothing on the server', () => {
    const url = '/analytics?utm_source=email&utm_campaign=x';
    const service = setup(url, 'server');

    service.trackFromUrl(url);

    expect(logging.logEvent).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
