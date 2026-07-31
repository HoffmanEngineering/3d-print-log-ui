import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { ActivityResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { ActivityTabComponent } from './activity-tab.component';

const response = (
  overrides: Partial<ActivityResponse> = {}
): ActivityResponse => ({
  from: null,
  to: null,
  timeZone: 'UTC',
  granularity: 'Day',
  currency: 'USD',
  series: [
    {
      index: 0,
      localStart: '2026-07-01',
      count: 2,
      durationSeconds: 7200,
      materialMg: 40000,
      cost: 3.5,
    },
    {
      index: 1,
      localStart: '2026-07-02',
      count: 1,
      durationSeconds: 3600,
      materialMg: 20000,
      cost: 1.5,
    },
  ],
  calendar: [
    { date: '2026-07-01', count: 2 },
    { date: '2026-07-02', count: 1 },
  ],
  calendarFrom: '2026-07-01',
  calendarTo: '2026-07-02',
  streaks: {
    currentDays: 2,
    longestDays: 2,
    longestStart: '2026-07-01',
    longestEnd: '2026-07-02',
    busiestDate: '2026-07-01',
    busiestDateCount: 2,
    busiestWeekday: 3,
    busiestWeekdayCount: 2,
  },
  durationHistogram: [
    { label: '<30m', lowerSeconds: 0, upperSeconds: 1800, count: 0 },
    { label: '1–2h', lowerSeconds: 3600, upperSeconds: 7200, count: 3 },
  ],
  startTimeMatrix: [{ weekday: 3, hour: 9, count: 3 }],
  coverage: {
    population: 'prints',
    counted: 3,
    total: 3,
    undatedCount: 0,
    exclusions: [],
  },
  ...overrides,
});

describe('ActivityTabComponent', () => {
  let fixture: ComponentFixture<ActivityTabComponent>;
  let component: ActivityTabComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  /**
   * Synchronous on purpose, to be called inside fakeAsync: createTabData debounces by 250ms,
   * and whenStable() only drains microtasks — it never advances a timer, so a promise-based
   * setup would assert against an empty tab every time.
   */
  const setup = () => {
    fixture = TestBed.createComponent(ActivityTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getActivity',
    ]);
    analytics.getActivity.and.returnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [ActivityTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  it('renders the series in chronological order regardless of response order', fakeAsync(() => {
    analytics.getActivity.and.returnValue(
      of(
        response({
          series: [
            {
              index: 1,
              localStart: '2026-07-02',
              count: 1,
              durationSeconds: 3600,
              materialMg: 20000,
              cost: 1.5,
            },
            {
              index: 0,
              localStart: '2026-07-01',
              count: 2,
              durationSeconds: 7200,
              materialMg: 40000,
              cost: 3.5,
            },
          ],
        })
      )
    );
    setup();

    expect(component.seriesData().map((d) => d.fullLabel)).toEqual(
      component
        .seriesData()
        .map((d) => d.fullLabel)
        .slice()
        .sort()
    );
    expect(component.seriesData()[0].values['value']).toBe(2);
  }));

  it('switches the plotted metric without issuing another request', fakeAsync(() => {
    setup();
    expect(component.seriesData()[0].values['value']).toBe(2);

    component.setMetric('time');
    expect(component.seriesData()[0].values['value']).toBe(7200);

    component.setMetric('filament');
    expect(component.seriesData()[0].values['value']).toBe(40);

    component.setMetric('cost');
    expect(component.seriesData()[0].values['value']).toBe(3.5);

    expect(analytics.getActivity).toHaveBeenCalledTimes(1);
  }));

  it('disables the cost metric when the server could not cost the range', fakeAsync(() => {
    analytics.getActivity.and.returnValue(
      of(
        response({
          series: [
            {
              index: 0,
              localStart: '2026-07-01',
              count: 2,
              durationSeconds: 7200,
              materialMg: 40000,
              cost: null,
            },
          ],
        })
      )
    );
    setup();

    expect(component.costAvailable()).toBeFalse();
  }));

  it('fails the whole tab on an error, with one retry affordance', fakeAsync(() => {
    analytics.getActivity.and.returnValue(throwError(() => new Error('boom')));
    setup();

    expect(component.state()).toBe('error');
  }));

  it('renders the streak summary in plain language', fakeAsync(() => {
    setup();

    expect(component.streakSummary()).toContain('2');
  }));
});
