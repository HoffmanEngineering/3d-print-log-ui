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
import { CostsResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { CostsTabComponent } from './costs-tab.component';

const coverage = {
  population: 'prints',
  counted: 4,
  total: 4,
  undatedCount: 0,
  exclusions: [],
};

const money = (value: number | null) => ({
  value,
  previous: null,
  currency: 'USD',
  coverage,
});

const response = (overrides: Partial<CostsResponse> = {}): CostsResponse => ({
  from: null,
  to: null,
  timeZone: 'UTC',
  granularity: 'Day',
  currency: 'USD',
  totalSpend: money(42.5),
  filamentSpend: money(30),
  electricitySpend: money(2.5),
  maintenanceSpend: money(10),
  spendOverTime: [
    {
      index: 1,
      localStart: '2026-07-02',
      filament: 10,
      electricity: 1,
      maintenance: null,
    },
    {
      index: 0,
      localStart: '2026-07-01',
      filament: 20,
      electricity: 1.5,
      maintenance: 10,
    },
  ],
  costPerPrint: [
    { label: '<1', lowerSeconds: 0, upperSeconds: 1, count: 1 },
    { label: '1–2', lowerSeconds: 1, upperSeconds: 2, count: 3 },
  ],
  byMaterialType: [
    { key: 'PLA', label: 'PLA', amount: 20, printCount: 3 },
    { key: 'PETG', label: 'PETG', amount: 10, printCount: 1 },
  ],
  byBrand: [{ key: 'Acme', label: 'Acme', amount: 30, printCount: 4 }],
  costOfFailure: money(5),
  costOfFailureSharePercent: 11.7647,
  mostExpensive: [{ printId: 1, title: 'Big', date: '2026-07-01', amount: 20 }],
  leastExpensive: [
    { printId: 2, title: 'Small', date: '2026-07-02', amount: 1 },
  ],
  coverage,
  ...overrides,
});

describe('CostsTabComponent', () => {
  let fixture: ComponentFixture<CostsTabComponent>;
  let component: CostsTabComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  // createTabData debounces by 250ms, so the response only lands after the timer is
  // flushed — a plain whenStable() would assert against a still-loading tab.
  const setup = () => {
    fixture = TestBed.createComponent(CostsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getCosts',
    ]);
    analytics.getCosts.and.returnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [CostsTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  it('sorts spend-over-time chronologically, not by response order', fakeAsync(() => {
    setup();

    expect(component.spendData().map((d) => d.fullLabel)).toEqual(
      component
        .spendData()
        .map((d) => d.fullLabel)
        .slice()
        .sort()
    );
  }));

  it('keeps the three cost components on fixed colours across the tab', fakeAsync(() => {
    setup();

    expect(component.componentSeries.map((s) => s.key)).toEqual([
      'filament',
      'electricity',
      'maintenance',
    ]);
    expect(component.componentSeries.map((s) => s.seriesIndex)).toEqual([
      1, 2, 3,
    ]);
  }));

  it('offers a setup CTA for each specific missing input, not a generic one', fakeAsync(() => {
    analytics.getCosts.and.returnValue(
      of(
        response({
          coverage: {
            population: 'prints',
            counted: 0,
            total: 4,
            undatedCount: 0,
            exclusions: [
              { reason: 'PriceMissing', count: 4 },
              { reason: 'RateMissing', count: 4 },
            ],
          },
        })
      )
    );
    setup();

    const calls = component.setupActions().map((a) => a.reason);
    expect(calls).toContain('PriceMissing');
    expect(calls).toContain('RateMissing');
    expect(calls).not.toContain('WattageMissing');
  }));

  it('shows no setup CTA when everything is priced', fakeAsync(() => {
    setup();

    expect(component.setupActions()).toEqual([]);
  }));

  it('keeps an unpriced component distinguishable from a genuine zero', fakeAsync(() => {
    setup();

    // The chart has to coerce null to 0 — a stacked segment of unknown height is not drawable —
    // but the accessible table and the CSV must not claim maintenance cost nothing in a period
    // where it simply could not be priced.
    const july2 = component
      .spendRows()
      .find((row) => row.components.some((c) => c.value === null));
    expect(july2).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('not recorded');

    const maintenanceCell = component
      .spendCsv()
      .rows.find((row) => row[0] === '2026-07-02');
    expect(maintenanceCell?.[3]).toBeNull();
  }));

  it('renders the failure share only when it is defined', fakeAsync(() => {
    analytics.getCosts.and.returnValue(
      of(response({ costOfFailureSharePercent: null }))
    );
    setup();

    expect(component.failureShareText()).toBeNull();
  }));

  it('renders the extremes as currency, ranked, and linked to the print', fakeAsync(() => {
    setup();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.costs-tab__extremes-row'
    );
    expect(rows.length).toBe(2);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // A bare "20.00" is not a cost, and the tiles above are already currency-formatted.
    expect(text).toContain('$20.00');
    expect(text).toContain('$1.00');

    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/prints/1');
  }));

  it('names an untitled print rather than rendering an empty link', fakeAsync(() => {
    analytics.getCosts.and.returnValue(
      of(
        response({
          mostExpensive: [{ printId: 9, title: null, date: null, amount: 3 }],
        })
      )
    );
    setup();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.costs-tab__extremes-link'
    );
    expect(link?.textContent?.trim()).toBe('Untitled print');
  }));

  it('fails the whole tab on an error', fakeAsync(() => {
    analytics.getCosts.and.returnValue(throwError(() => new Error('boom')));
    setup();

    expect(component.state()).toBe('error');
  }));
});
