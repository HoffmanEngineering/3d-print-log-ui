import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { PrintStatus } from 'src/app/core/services/print.service';
import { AnalyticsFilterStore } from 'src/app/analytics/filters/analytics-filter.store';
import { OverviewResponse } from 'src/app/analytics/models/analytics.models';
import { AnalyticsService } from 'src/app/analytics/services/analytics.service';
import { OverviewTabComponent } from './overview-tab.component';

function response(
  printCount: number,
  material: {
    grams?: number | null;
    ml?: number | null;
  } = {}
): OverviewResponse {
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
      filamentGrams: metric(
        material.grams === undefined ? 3200 : material.grams
      ),
      filamentMl: metric(material.ml ?? 0),
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
  let analytics: MockedObject<AnalyticsService>;
  let store: AnalyticsFilterStore;

  beforeEach(async () => {
    analytics = {
      getOverview: vi.fn().mockName('AnalyticsService.getOverview'),
    } as unknown as MockedObject<AnalyticsService>;

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

  it('renders six stat tiles once loaded', async () => {
    vi.useFakeTimers();
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.mockReturnValue(subject);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    subject.next(response(42));
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-stat-tile')
        .length
    ).toBe(6);
  });

  it('debounces rapid filter changes into a single request', async () => {
    vi.useFakeTimers();
    analytics.getOverview.mockReturnValue(new Subject<OverviewResponse>());

    fixture.detectChanges();
    store.setPreset('last7');
    store.setPreset('last30');
    store.setPreset('last90');
    await vi.advanceTimersByTimeAsync(300);

    expect(analytics.getOverview).toHaveBeenCalledTimes(1);
  });

  it('discards a stale response so an older result cannot overwrite a newer one', async () => {
    vi.useFakeTimers();
    const first = new Subject<OverviewResponse>();
    const second = new Subject<OverviewResponse>();
    analytics.getOverview
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);

    store.setPreset('last7');
    await vi.advanceTimersByTimeAsync(300);

    second.next(response(7));
    first.next(response(999)); // arrives late; must be ignored
    fixture.detectChanges();

    expect(fixture.componentInstance.data()?.tiles.printCount.value).toBe(7);
  });

  it('shows an error state with a retry when the request fails', async () => {
    vi.useFakeTimers();
    analytics.getOverview.mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('error');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="chart-retry"]'
      )
    ).toBeTruthy();
  });

  it('labels a date-only bucket with the civil date the server sent', async () => {
    vi.useFakeTimers();
    // The series carries DateOnly ("2026-07-01"). Parsed as UTC it renders as 6/30 anywhere
    // west of UTC, so the whole chart reads a day early for most of the Americas.
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.mockReturnValue(subject);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    subject.next(response(3));
    fixture.detectChanges();

    expect(fixture.componentInstance.barData()[0].label).toBe('7/1');
  });

  it('sorts time buckets chronologically when the API returns newest first', async () => {
    vi.useFakeTimers();
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.mockReturnValue(subject);
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
    await vi.advanceTimersByTimeAsync(300);
    subject.next(result);
    fixture.detectChanges();
    expect(
      fixture.componentInstance.barData().map((item) => item.fullLabel)
    ).toEqual(['Jun 2026', 'Jul 2026']);
  });

  it('navigates click-through using the param the print list actually reads', async () => {
    vi.useFakeTimers();
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.mockReturnValue(subject);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    subject.next(response(3));
    fixture.detectChanges();

    fixture.componentInstance.onSliceSelect({ key: 'Failed' });

    const [path, extras] = vi.mocked(navigate).mock.lastCall;
    expect(path).toEqual(['/prints']);

    // Singular: print-list-resolver.service.ts reads `filterByStatus`. The plural form has no
    // client consumer, so sending it produced a link that looked filtered and was not.
    const params = extras!.queryParams as Record<string, unknown>;
    expect(params['filterByStatus']).toBe(PrintStatus.Failed);
    expect(params['filterByStatuses']).toBeUndefined();
    // A userId would turn the list into that user's PUBLIC prints only.
    expect(params['userId']).toBeUndefined();
  });

  it('renders each highlight in the unit its tile uses, not the raw API token', async () => {
    vi.useFakeTimers();
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.mockReturnValue(subject);
    const result = response(4);
    result.highlights = {
      mostUsedPrinter: { id: '1', label: 'Ender', value: 4, unit: 'prints' },
      mostUsedMaterial: null,
      longestPrint: { id: '2', label: 'Vase', value: 9000, unit: 'seconds' },
      priciestPrint: { id: '3', label: 'Big', value: 0.84, unit: 'cost' },
    };

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
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
  });

  it('reports an empty state rather than an error when there are no prints', async () => {
    vi.useFakeTimers();
    const subject = new Subject<OverviewResponse>();
    analytics.getOverview.mockReturnValue(subject);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    subject.next(response(0));
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('empty');
  });

  // 3d-print-log-api#294: resin is in mL, beside the grams or instead of them.
  describe('filament tile', () => {
    const filamentTile = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('app-stat-tile')
      ).find((tile) => tile.textContent?.includes('used')) as HTMLElement;

    const load = async (overview: OverviewResponse) => {
      const subject = new Subject<OverviewResponse>();
      analytics.getOverview.mockReturnValue(subject);
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(300);
      subject.next(overview);
      fixture.detectChanges();
    };

    it('shows grams alone for a filament-only user', async () => {
      vi.useFakeTimers();
      await load(response(4));

      expect(filamentTile().textContent).toContain('3.2 kg');
      expect(filamentTile().textContent).not.toContain('mL');
    });

    it('shows both when the range has filament and resin', async () => {
      vi.useFakeTimers();
      await load(response(4, { grams: 34000, ml: 20 }));

      expect(filamentTile().textContent).toContain('34.0 kg · 20.0 mL');
    });

    it('shows mL alone, labeled as material, when the range has no grams', async () => {
      vi.useFakeTimers();
      await load(response(4, { grams: 0, ml: 72.75 }));

      expect(filamentTile().textContent).toContain('72.8 mL');
      expect(filamentTile().textContent).toContain('Material used');
      expect(filamentTile().textContent).not.toContain(' g');
    });

    it('keeps the grams tile against an API without filamentMl', async () => {
      vi.useFakeTimers();
      const older = response(4);
      delete (older.tiles as Partial<typeof older.tiles>).filamentMl;
      await load(older);

      expect(filamentTile().textContent).toContain('3.2 kg');
      expect(filamentTile().textContent).not.toContain('mL');
    });

    it('appends the mL row to the tab CSV after the existing tiles', async () => {
      vi.useFakeTimers();
      await load(response(4, { grams: 34000, ml: 20 }));

      const rows = fixture.componentInstance.tileRows();
      expect(rows.map((row) => row[0])).toEqual([
        'Prints',
        'Success rate (%)',
        'Filament (g)',
        'Print time (s)',
        'Total cost',
        'Average print time (s)',
        'Filament (mL)',
      ]);
      expect(rows.at(-1)).toEqual(['Filament (mL)', 20, null]);
    });
  });
});
