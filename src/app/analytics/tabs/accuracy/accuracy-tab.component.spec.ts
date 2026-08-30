import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { AccuracyResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { AccuracyTabComponent } from './accuracy-tab.component';

const coverage = {
  population: 'prints',
  counted: 9,
  total: 9,
  undatedCount: 0,
  exclusions: [],
};

const response = (
  overrides: Partial<AccuracyResponse> = {}
): AccuracyResponse => ({
  from: null,
  to: null,
  timeZone: 'UTC',
  granularity: 'Day',
  timeAccuracyMedian: { value: 1.1, previous: null, coverage },
  materialAccuracyMedian: { value: 0.95, previous: null, coverage },
  timeScatter: [
    { estimated: 3600, actual: 3900, count: 4 },
    { estimated: 7200, actual: 7000, count: 5 },
  ],
  byPrinter: [
    {
      scope: 'printer',
      key: '42',
      label: 'Ender 3',
      medianRatio: 1.2,
      sampleSize: 9,
      suppressedForSmallSample: false,
    },
  ],
  byMaterial: [
    {
      scope: 'material',
      key: 'PLA',
      label: 'PLA',
      medianRatio: 0.98,
      sampleSize: 7,
      suppressedForSmallSample: false,
    },
  ],
  biasTrend: [
    { index: 1, localStart: '2026-07-02', medianRatio: 1.1, sampleSize: 5 },
    { index: 0, localStart: '2026-07-01', medianRatio: 1.05, sampleSize: 6 },
  ],
  callouts: [],
  coverage,
  ...overrides,
});

describe('AccuracyTabComponent', () => {
  let fixture: ComponentFixture<AccuracyTabComponent>;
  let component: AccuracyTabComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  // createTabData debounces by 250ms, so the response only lands after the timer is
  // flushed — a plain whenStable() would assert against a still-loading tab.
  const setup = () => {
    fixture = TestBed.createComponent(AccuracyTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getAccuracy',
    ]);
    analytics.getAccuracy.and.returnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [AccuracyTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  it('composes a callout sentence from the structured facts', fakeAsync(() => {
    analytics.getAccuracy.and.returnValue(
      of(
        response({
          callouts: [
            {
              scope: 'printer',
              key: '1',
              label: 'Ender 3',
              dimension: 'time',
              medianRatio: 1.18,
              sampleSize: 22,
            },
          ],
        })
      )
    );
    setup();

    const text = component.calloutMessages()[0];
    expect(text).toContain('Ender 3');
    expect(text).toContain('18%');
    expect(text).toContain('longer');
  }));

  it('says "shorter" when the ratio is below one', fakeAsync(() => {
    analytics.getAccuracy.and.returnValue(
      of(
        response({
          callouts: [
            {
              scope: 'printer',
              key: '1',
              label: 'Ender 3',
              dimension: 'time',
              medianRatio: 0.8,
              sampleSize: 22,
            },
          ],
        })
      )
    );
    setup();

    expect(component.calloutMessages()[0]).toContain('shorter');
  }));

  it('renders a suppressed group as "Not enough data yet" rather than a blank', fakeAsync(() => {
    analytics.getAccuracy.and.returnValue(
      of(
        response({
          byPrinter: [
            {
              scope: 'printer',
              key: '1',
              label: 'Ender 3',
              medianRatio: null,
              sampleSize: 2,
              suppressedForSmallSample: true,
            },
          ],
        })
      )
    );
    setup();

    expect(fixture.nativeElement.textContent).toContain('Not enough data yet');
  }));

  it('substitutes bars for the scatter on a narrow container without changing the request', fakeAsync(() => {
    setup();
    expect(component.showScatter()).toBeTrue();

    component.containerWidth.set(400);
    fixture.detectChanges();

    expect(component.showScatter()).toBeFalse();
    // The phone substitution is a RENDERING choice: the payload is identical at every width.
    expect(analytics.getAccuracy).toHaveBeenCalledTimes(1);
  }));

  it('resolves a clicked bar back to its printer id and navigates', fakeAsync(() => {
    setup();

    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.onBarSelect({ label: 'Ender 3', seriesKey: 'value' });

    const [commands, extras] = navigate.calls.mostRecent().args as [
      unknown[],
      { queryParams: Record<string, unknown> },
    ];
    expect(commands).toEqual(['/prints']);
    expect(extras.queryParams['filterByPrinterId']).toBe('42');
    expect(extras.queryParams['userId']).toBeUndefined();
  }));

  it('does not navigate when two printers share a label', fakeAsync(() => {
    analytics.getAccuracy.and.returnValue(
      of(
        response({
          byPrinter: [
            {
              scope: 'printer',
              key: '1',
              label: 'Ender 3',
              medianRatio: 1.2,
              sampleSize: 9,
              suppressedForSmallSample: false,
            },
            {
              scope: 'printer',
              key: '2',
              label: 'Ender 3',
              medianRatio: 0.9,
              sampleSize: 7,
              suppressedForSmallSample: false,
            },
          ],
        })
      )
    );
    setup();

    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.onBarSelect({ label: 'Ender 3', seriesKey: 'value' });

    // Guessing which of two same-named printers was meant is worse than doing nothing.
    expect(navigate).not.toHaveBeenCalled();
  }));

  it('fails the whole tab on an error', fakeAsync(() => {
    analytics.getAccuracy.and.returnValue(throwError(() => new Error('boom')));
    setup();

    expect(component.state()).toBe('error');
  }));
});
