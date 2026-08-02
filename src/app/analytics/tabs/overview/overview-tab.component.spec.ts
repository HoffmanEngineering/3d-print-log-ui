import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { PrintStatus } from 'src/app/core/services/print.service';
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

  it('labels a date-only bucket with the civil date the server sent', fakeAsync(() => {
    // The series carries DateOnly ("2026-07-01"). Parsed as UTC it renders as 6/30 anywhere
    // west of UTC, so the whole chart reads a day early for most of the Americas.
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValue(subject);

    fixture.detectChanges();
    tick(300);
    subject.next(response(3));
    fixture.detectChanges();

    expect(fixture.componentInstance.barData()[0].label).toBe('7/1');
  }));

  it('sorts time buckets chronologically when the API returns newest first', fakeAsync(() => {
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValue(subject);
    const result = response(3);
    result.granularity = 'Month';
    result.series = [
      {
        index: 1,
        localStart: '2026-07-01',
        countsByStatus: { Success: 2, Failed: 0 },
      },
      {
        index: 0,
        localStart: '2026-06-01',
        countsByStatus: { Success: 1, Failed: 0 },
      },
    ];
    fixture.detectChanges();
    tick(300);
    subject.next(result);
    fixture.detectChanges();
    expect(
      fixture.componentInstance.barData().map((item) => item.fullLabel)
    ).toEqual(['Jun 2026', 'Jul 2026']);
  }));

  it('navigates click-through using the param the print list actually reads', fakeAsync(() => {
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValue(subject);
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.detectChanges();
    tick(300);
    subject.next(response(3));
    fixture.detectChanges();

    fixture.componentInstance.onSliceSelect({ key: 'Failed' });

    const [path, extras] = navigate.calls.mostRecent().args;
    expect(path).toEqual(['/prints']);

    // Singular: print-list-resolver.service.ts reads `filterByStatus`. The plural form has no
    // client consumer, so sending it produced a link that looked filtered and was not.
    const params = extras!.queryParams as Record<string, unknown>;
    expect(params['filterByStatus']).toBe(PrintStatus.Failed);
    expect(params['filterByStatuses']).toBeUndefined();
    // A userId would turn the list into that user's PUBLIC prints only.
    expect(params['userId']).toBeUndefined();
  }));

  it('renders each highlight in the unit its tile uses, not the raw API token', fakeAsync(() => {
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.and.returnValue(subject);
    const result = response(4);
    result.highlights = {
      mostUsedPrinter: { id: '1', label: 'Ender', value: 4, unit: 'prints' },
      mostUsedMaterial: null,
      longestPrint: { id: '2', label: 'Vase', value: 9000, unit: 'seconds' },
      priciestPrint: { id: '3', label: 'Big', value: 0.84, unit: 'cost' },
    };

    fixture.detectChanges();
    tick(300);
    subject.next(result);
    fixture.detectChanges();

    const displays = fixture.componentInstance
      .highlights()
      .map((item) => item.display);

    // The currency comes from the cost tile's own currency, so the highlight and the tile
    // can never disagree about what "0.84" is denominated in.
    expect(displays).toContain('$0.84');
    expect(displays).toContain('2h 30m');
    expect(displays).toContain('4 prints');
    expect(fixture.nativeElement.textContent).not.toContain('0.84 cost');
    expect(fixture.nativeElement.textContent).not.toContain('9000 seconds');
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
