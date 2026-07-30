import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AnalyticsFilterStore } from 'src/app/analytics/filters/analytics-filter.store';
import { OverviewResponse } from 'src/app/analytics/models/analytics.models';
import { AnalyticsService } from 'src/app/analytics/services/analytics.service';
import { OverviewTabComponent } from './overview-tab.component';

function response(printCount: number): OverviewResponse {
  const coverage = {
    population: 'prints',
    counted: printCount,
    total: printCount,
    undatedCount: 0,
    exclusions: [],
  };
  const metric = (v: number | null) => ({ value: v, previous: null, coverage });

  return {
    from: null,
    to: null,
    timeZone: 'UTC',
    granularity: 'Day',
    tiles: {
      printCount: metric(printCount),
      successRatePercent: metric(91),
      filamentGrams: metric(3200),
      printTimeSeconds: metric(9000),
      totalCost: {
        value: 48.1,
        previous: null,
        currency: 'USD',
        coverage,
      },
      avgPrintTimeSeconds: metric(214),
    },
    statusBreakdown: [
      { status: 'Success', count: printCount },
      { status: 'Failed', count: 0 },
    ],
    series: [
      {
        index: 0,
        localStart: '2026-07-01',
        countsByStatus: { Success: printCount, Failed: 0 },
      },
    ],
    highlights: {
      mostUsedPrinter: null,
      mostUsedMaterial: null,
      longestPrint: null,
      priciestPrint: null,
    },
  };
}

describe('OverviewTabComponent', () => {
  let fixture: ComponentFixture<OverviewTabComponent>;
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let store: AnalyticsFilterStore;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getOverview',
    ]);

    await TestBed.configureTestingModule({
      imports: [OverviewTabComponent, NoopAnimationsModule],
      providers: [
        AnalyticsFilterStore,
        provideRouter([]),
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewTabComponent);
    store = TestBed.inject(AnalyticsFilterStore);
  });

  it('renders six stat tiles once loaded', fakeAsync(() => {
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValue(subject);

    fixture.detectChanges();
    tick(300);
    subject.next(response(42));
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-stat-tile')
        .length
    ).toBe(6);
  }));

  it('debounces rapid filter changes into a single request', fakeAsync(() => {
    analytics.getOverview.and.returnValue(new Subject<OverviewResponse>());

    fixture.detectChanges();
    store.setPreset('last7');
    store.setPreset('last30');
    store.setPreset('last90');
    tick(300);

    expect(analytics.getOverview).toHaveBeenCalledTimes(1);
  }));

  it('discards a stale response so an older result cannot overwrite a newer one', fakeAsync(() => {
    const first = new Subject<OverviewResponse>();
    const second = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValues(first, second);

    fixture.detectChanges();
    tick(300);

    store.setPreset('last7');
    tick(300);

    second.next(response(7));
    first.next(response(999)); // arrives late; must be ignored
    fixture.detectChanges();

    expect(fixture.componentInstance.data()?.tiles.printCount.value).toBe(7);
  }));

  it('shows an error state with a retry when the request fails', fakeAsync(() => {
    analytics.getOverview.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('error');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="chart-retry"]'
      )
    ).toBeTruthy();
  }));

  it('reports an empty state rather than an error when there are no prints', fakeAsync(() => {
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValue(subject);

    fixture.detectChanges();
    tick(300);
    subject.next(response(0));
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('empty');
  }));
});
