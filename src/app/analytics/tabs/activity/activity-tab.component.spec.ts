import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      materialMl: 0,
      cost: 3.5,
    },
    {
      index: 1,
      localStart: '2026-07-02',
      count: 1,
      durationSeconds: 3600,
      materialMg: 20000,
      materialMl: 0,
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
  let analytics: MockedObject<AnalyticsService>;

  /**
   * Advances fake timers, so call it after vi.useFakeTimers(): createTabData debounces by
   * 250ms, and whenStable() never advances a timer, so a setup that waited for stability
   * would assert against an empty tab every time.
   */
  const setup = async () => {
    fixture = TestBed.createComponent(ActivityTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = {
      getActivity: vi.fn().mockName('AnalyticsService.getActivity'),
    } as unknown as MockedObject<AnalyticsService>;
    analytics.getActivity.mockReturnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [ActivityTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  it('renders the series in chronological order regardless of response order', async () => {
    vi.useFakeTimers();
    analytics.getActivity.mockReturnValue(
      of(
        response({
          series: [
            {
              index: 1,
              localStart: '2026-07-02',
              count: 1,
              durationSeconds: 3600,
              materialMg: 20000,
              materialMl: 0,
              cost: 1.5,
            },
            {
              index: 0,
              localStart: '2026-07-01',
              count: 2,
              durationSeconds: 7200,
              materialMg: 40000,
              materialMl: 0,
              cost: 3.5,
            },
          ],
        })
      )
    );
    await setup();

    expect(component.seriesData().map((d) => d.fullLabel)).toEqual(
      component
        .seriesData()
        .map((d) => d.fullLabel)
        .slice()
        .sort()
    );
    expect(component.seriesData()[0].values['value']).toBe(2);
  });

  it('switches the plotted metric without issuing another request', async () => {
    vi.useFakeTimers();
    await setup();
    expect(component.seriesData()[0].values['value']).toBe(2);

    component.setMetric('time');
    expect(component.seriesData()[0].values['value']).toBe(7200);

    component.setMetric('filament');
    expect(component.seriesData()[0].values['value']).toBe(40);

    component.setMetric('cost');
    expect(component.seriesData()[0].values['value']).toBe(3.5);

    expect(analytics.getActivity).toHaveBeenCalledTimes(1);
  });

  it('disables the cost metric when the server could not cost the range', async () => {
    vi.useFakeTimers();
    analytics.getActivity.mockReturnValue(
      of(
        response({
          series: [
            {
              index: 0,
              localStart: '2026-07-01',
              count: 2,
              durationSeconds: 7200,
              materialMg: 40000,
              materialMl: 0,
              cost: null,
            },
          ],
        })
      )
    );
    await setup();

    expect(component.costAvailable()).toBe(false);
  });

  it('fails the whole tab on an error, with one retry affordance', async () => {
    vi.useFakeTimers();
    analytics.getActivity.mockReturnValue(throwError(() => new Error('boom')));
    await setup();

    expect(component.state()).toBe('error');
  });

  it('renders the streak summary in plain language', async () => {
    vi.useFakeTimers();
    await setup();

    expect(component.streakSummary()).toContain('2');
  });

  // 3d-print-log-api#294: resin is plotted in mL, never folded into grams.
  describe('resin', () => {
    const withResin = () =>
      response({
        series: [
          {
            index: 0,
            localStart: '2026-07-01',
            count: 2,
            durationSeconds: 7200,
            materialMg: 40000,
            materialMl: 0,
            cost: 3.5,
          },
          {
            index: 1,
            localStart: '2026-07-02',
            count: 1,
            durationSeconds: 3600,
            materialMg: 0,
            materialMl: 42.5,
            cost: 1.5,
          },
        ],
      });
    const toggles = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'mat-button-toggle'
        ) as NodeListOf<HTMLElement>
      ).map((t) => t.textContent?.trim());

    it('offers no resin metric to a filament-only user', async () => {
      vi.useFakeTimers();
      await setup();

      expect(component.resinAvailable()).toBe(false);
      expect(toggles()).not.toContain('Resin');
    });

    it('plots each bucket in mL under the resin metric', async () => {
      vi.useFakeTimers();
      analytics.getActivity.mockReturnValue(of(withResin()));
      await setup();

      expect(toggles()).toContain('Resin');
      component.setMetric('resin');
      fixture.detectChanges();

      expect(component.seriesData().map((d) => d.values['value'])).toEqual([
        0, 42.5,
      ]);
      expect(component.seriesLabels.resin).toBe('Resin (mL)');
    });

    it('falls back to filament when the resin metric has nothing to plot', async () => {
      vi.useFakeTimers();
      await setup();
      component.setMetric('resin');

      expect(component.plottedMetric()).toBe('filament');
    });

    it('appends the mL column to the series CSV', async () => {
      vi.useFakeTimers();
      analytics.getActivity.mockReturnValue(of(withResin()));
      await setup();

      const csv = component.seriesCsv();
      expect(csv.columns).toEqual([
        'Period',
        'Prints',
        'Print time (s)',
        'Filament (g)',
        'Cost',
        'Filament (mL)',
      ]);
      expect(csv.rows.map((row) => row.at(-1))).toEqual([0, 42.5]);
    });
  });
});
