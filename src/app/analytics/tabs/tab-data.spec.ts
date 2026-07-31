import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AnalyticsFilterValue } from '../models/analytics.models';
import { createTabData } from './tab-data';

const filterValue = (timeZone: string): AnalyticsFilterValue => ({
  fromDate: null,
  toDate: null,
  timeZone,
  printerIds: [],
  filamentIds: [],
  projectIds: [],
  statuses: [],
  granularity: 'Auto',
  comparePrevious: false,
});

describe('createTabData', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('starts loading and becomes ready with the response', fakeAsync(() => {
    const filter = signal(filterValue('UTC'));
    const responses = new Subject<{ count: number }>();

    const tab = runInInjectionContext(injector, () =>
      createTabData(
        filter,
        () => responses,
        (r) => r.count === 0
      )
    );

    tick(250);
    expect(tab.state()).toBe('loading');

    responses.next({ count: 3 });
    expect(tab.state()).toBe('ready');
    expect(tab.data()).toEqual({ count: 3 });
  }));

  it('reports empty when the response has no data', fakeAsync(() => {
    const filter = signal(filterValue('UTC'));
    const responses = new Subject<{ count: number }>();

    const tab = runInInjectionContext(injector, () =>
      createTabData(
        filter,
        () => responses,
        (r) => r.count === 0
      )
    );

    tick(250);
    responses.next({ count: 0 });

    expect(tab.state()).toBe('empty');
  }));

  it('fails the whole tab on an error and recovers on retry', fakeAsync(() => {
    const filter = signal(filterValue('UTC'));
    let attempt = 0;

    const tab = runInInjectionContext(injector, () =>
      createTabData(
        filter,
        () => {
          attempt++;
          // First load fails, second succeeds — so the test proves BOTH that an error
          // surfaces and that retry actually clears it.
          return attempt === 1
            ? throwError(() => new Error('boom'))
            : of({ count: 2 });
        },
        (r) => r.count === 0
      )
    );

    tick(250);
    expect(attempt).toBe(1);
    expect(tab.state()).toBe('error');
    expect(tab.data()).toBeNull();

    tab.retry();
    tick(250);
    expect(attempt).toBe(2);
    expect(tab.state()).toBe('ready');
    expect(tab.data()).toEqual({ count: 2 });
  }));

  it('never applies a response from a superseded filter', fakeAsync(() => {
    const filter = signal(filterValue('UTC'));
    const byZone = new Map<string, Subject<{ zone: string }>>();

    const tab = runInInjectionContext(injector, () =>
      createTabData(
        filter,
        (f) => {
          const subject = new Subject<{ zone: string }>();
          byZone.set(f.timeZone, subject);
          return subject;
        },
        () => false
      )
    );

    tick(250);
    filter.set(filterValue('America/Chicago'));
    tick(250);

    // The FIRST request answers last. switchMap must have unsubscribed it, so the stale
    // answer can never land on top of the newer one.
    byZone.get('UTC')!.next({ zone: 'UTC' });
    byZone.get('America/Chicago')!.next({ zone: 'America/Chicago' });

    expect(tab.data()).toEqual({ zone: 'America/Chicago' });
  }));
});
