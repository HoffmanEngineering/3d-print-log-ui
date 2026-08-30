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
import { MaterialsResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { MaterialsTabComponent } from './materials-tab.component';

const coverage = {
  population: 'prints',
  counted: 1,
  total: 1,
  undatedCount: 0,
  exclusions: [],
};

const swatch = {
  colors: ['ff0000'],
  colorPattern: 1,
  finishType: 1,
  effects: [],
};

const response = (
  overrides: Partial<MaterialsResponse> = {}
): MaterialsResponse => ({
  from: null,
  to: null,
  timeZone: 'UTC',
  granularity: 'Day',
  currency: 'USD',
  byType: [
    { key: 'PLA', label: 'PLA', printCount: 3, materialMg: 60000, swatch },
  ],
  byBrand: [
    { key: 'Acme', label: 'Acme', printCount: 3, materialMg: 60000, swatch },
  ],
  byColor: [
    { key: 'Red', label: 'Red', printCount: 3, materialMg: 60000, swatch },
  ],
  consumptionOverTime: [
    { index: 1, localStart: '2026-07-02', materialMgByType: { PLA: 20000 } },
    { index: 0, localStart: '2026-07-01', materialMgByType: { PLA: 40000 } },
  ],
  topSpools: [
    {
      filamentId: 'f1',
      label: 'Acme PLA Red',
      swatch,
      usedMg: 60000,
      remainingMg: 940000,
      initialMg: 1000000,
      percentConsumed: 6,
      costConsumed: null,
    },
  ],
  runway: [
    {
      filamentId: 'f1',
      label: 'Acme PLA Red',
      swatch,
      remainingGrams: 940,
      burnRateGramsPerDay: 10,
      runwayDays: 94,
    },
  ],
  wasteGrams: { value: 5, previous: null, coverage },
  wasteCost: { value: 1.25, previous: null, currency: 'USD', coverage },
  coverage,
  ...overrides,
});

describe('MaterialsTabComponent', () => {
  let fixture: ComponentFixture<MaterialsTabComponent>;
  let component: MaterialsTabComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  // createTabData debounces by 250ms, so the response only lands after the timer is
  // flushed — a plain whenStable() would assert against a still-loading tab.
  const setup = () => {
    fixture = TestBed.createComponent(MaterialsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getMaterials',
    ]);
    analytics.getMaterials.and.returnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [MaterialsTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  it('gives by-type bars a swatch fill referencing the chart-local defs', fakeAsync(() => {
    setup();

    expect(component.byTypeData()[0].fill).toBeTruthy();
  }));

  it('does NOT swatch-fill the stacked consumption chart', fakeAsync(() => {
    setup();

    // Stacked series use the categorical palette; the swatch lives in the legend (spec §10).
    expect(component.consumptionData()[0].fill).toBeUndefined();
  }));

  it('sorts consumption chronologically, not by response order', fakeAsync(() => {
    setup();

    expect(component.consumptionData().map((d) => d.fullLabel)).toEqual(
      component
        .consumptionData()
        .map((d) => d.fullLabel)
        .slice()
        .sort()
    );
  }));

  it('lists running-low spools first and omits ones with no runway', fakeAsync(() => {
    analytics.getMaterials.and.returnValue(
      of(
        response({
          runway: [
            {
              filamentId: 'a',
              label: 'A',
              swatch,
              remainingGrams: 900,
              burnRateGramsPerDay: 0,
              runwayDays: null,
            },
            {
              filamentId: 'b',
              label: 'B',
              swatch,
              remainingGrams: 50,
              burnRateGramsPerDay: 10,
              runwayDays: 5,
            },
          ],
        })
      )
    );
    setup();

    expect(component.runningLow().map((r) => r.filamentId)).toEqual(['b']);
  }));

  it("links a spool row to that spool's prints, without a userId", fakeAsync(() => {
    setup();
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate');

    component.onSpoolSelect('f1');

    const [commands, extras] = navigate.calls.mostRecent().args as [
      unknown[],
      { queryParams: Record<string, unknown> },
    ];
    expect(commands).toEqual(['/prints']);
    expect(extras.queryParams['filterByFilamentId']).toBe('f1');
    // A userId would narrow the user's own list to their PUBLIC prints.
    expect(extras.queryParams['userId']).toBeUndefined();
  }));

  it('shows a negative remaining as-is rather than clamping it to zero', fakeAsync(() => {
    analytics.getMaterials.and.returnValue(
      of(
        response({
          topSpools: [
            {
              filamentId: 'f1',
              label: 'Overdrawn',
              swatch,
              usedMg: 1100000,
              remainingMg: -100000,
              initialMg: 1000000,
              percentConsumed: 110,
              costConsumed: null,
            },
          ],
        })
      )
    );
    setup();

    expect(fixture.nativeElement.textContent).toContain('-100');
  }));

  it('fails the whole tab on an error', fakeAsync(() => {
    analytics.getMaterials.and.returnValue(throwError(() => new Error('boom')));
    setup();

    expect(component.state()).toBe('error');
  }));
});
