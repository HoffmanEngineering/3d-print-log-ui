import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { EmailClickTrackerService } from './email-click-tracker.service';
import { LoggingService } from './logging.service';

describe('EmailClickTrackerService', () => {
  let logging: jasmine.SpyObj<LoggingService>;
  let navigate: jasmine.Spy;

  function setup(platform: 'browser' | 'server' = 'browser') {
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: LoggingService, useValue: logging },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(
      true
    );
    return TestBed.inject(EmailClickTrackerService);
  }

  it('logs the click and strips the utm parameters, keeping the rest', () => {
    const service = setup();

    service.trackFromUrl(
      '/analytics?utm_source=email&utm_medium=email&utm_campaign=monthly-recap&utm_content=2026-11&foo=1'
    );

    expect(logging.logEvent).toHaveBeenCalledWith('Email_Clicked', {
      campaign: 'monthly-recap',
      content: '2026-11',
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    const [tree, extras] = navigate.calls.mostRecent().args;
    const url = TestBed.inject(Router).serializeUrl(tree);
    expect(url).toBe('/analytics?foo=1');
    expect(extras).toEqual({ replaceUrl: true });
  });

  it('keeps the fragment', () => {
    const service = setup();

    service.trackFromUrl(
      '/settings?utm_source=email&utm_campaign=onboarding#email'
    );

    const url = TestBed.inject(Router).serializeUrl(
      navigate.calls.mostRecent().args[0]
    );
    expect(url).toBe('/settings#email');
  });

  it('ignores links that did not come from an email', () => {
    const service = setup();

    service.trackFromUrl('/analytics?utm_source=newsletter&utm_campaign=x');
    service.trackFromUrl('/analytics?foo=1');

    expect(logging.logEvent).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing on the server', () => {
    const service = setup('server');

    service.trackFromUrl('/analytics?utm_source=email&utm_campaign=x');

    expect(logging.logEvent).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
