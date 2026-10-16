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
    {
      key: 'PLA',
      label: 'PLA',
      printCount: 3,
      materialMg: 60000,
      adjustmentMg: 0,
      swatch,
    },
  ],
  byBrand: [
    {
      key: 'Acme',
      label: 'Acme',
      printCount: 3,
      materialMg: 60000,
      adjustmentMg: 0,
      swatch,
    },
  ],
  byColor: [
    {
      key: 'Red',
      label: 'Red',
      printCount: 3,
      materialMg: 60000,
      adjustmentMg: 0,
      swatch,
    },
  ],
  consumptionOverTime: [
    {
      index: 1,
      localStart: '2026-07-02',
      materialMgByType: { PLA: 20000 },
      adjustmentMg: 0,
    },
    {
      index: 0,
      localStart: '2026-07-01',
      materialMgByType: { PLA: 40000 },
      adjustmentMg: 0,
    },
  ],
  topSpools: [
    {
      filamentId: 'f1',
      label: 'Acme PLA Red',
      swatch,
      usedMg: 60000,
      adjustmentMg: 0,
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
              adjustmentMg: 0,
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

  describe('filament adjustments (api#231)', () => {
    const group = (
      key: string,
      printCount: number,
      materialMg: number,
      adjustmentMg: number
    ) => ({ key, label: key, printCount, materialMg, adjustmentMg, swatch });

    // Mirrors the API contract: a group with no prints is only sent when its net is positive,
    // but a group WITH prints can carry a negative adjustment that takes its net below zero.
    const adjusted = () =>
      response({
        byType: [
          group('PLA', 3, 60000, -80000),
          group('PETG', 0, 0, 25000),
          group('ABS', 2, 30000, -5000),
        ],
        consumptionOverTime: [
          {
            index: 0,
            localStart: '2026-07-01',
            materialMgByType: { PLA: 40000 },
            adjustmentMg: -15000,
          },
          {
            index: 1,
            localStart: '2026-07-02',
            materialMgByType: { PLA: 20000 },
            adjustmentMg: 0,
          },
        ],
        topSpools: [
          {
            filamentId: 'f1',
            label: 'Acme PLA Red',
            swatch,
            usedMg: 60000,
            adjustmentMg: 12500,
            remainingMg: 927500,
            initialMg: 1000000,
            percentConsumed: 7.25,
            costConsumed: 1.5,
          },
        ],
      });

    const csvRows = (csv: { columns: string[]; rows: unknown[][] }) =>
      csv.rows.map((row) =>
        Object.fromEntries(csv.columns.map((column, i) => [column, row[i]]))
      );

    it('adds Adjustments as a signed series beside the print stack', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const adjustments = component
        .consumptionSeries()
        .filter((series) => series.signed);
      expect(adjustments.length).toBe(1);
      expect(adjustments[0].label).toContain('Adjustments');
      // Every print series stays stacked.
      expect(
        component
          .consumptionSeries()
          .filter((series) => !series.signed)
          .map((series) => series.key)
      ).toEqual(['PLA', 'PETG', 'ABS']);
    }));

    it('keeps a negative adjustment negative in the series, in grams', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const key = component.consumptionSeries().find((s) => s.signed)!.key;
      const [first, second] = component.consumptionData();
      expect(first.values[key]).toBe(-15);
      expect(first.values['PLA']).toBe(40);
      expect(second.values[key] ?? 0).toBe(0);
    }));

    it('leaves the series out when no period has an adjustment', fakeAsync(() => {
      setup();

      expect(component.consumptionSeries().some((s) => s.signed)).toBeFalse();
    }));

    it('treats a missing adjustmentMg as zero (an older API)', fakeAsync(() => {
      const legacy = response() as unknown as Record<string, unknown[]>;
      const strip = (rows: unknown[]) =>
        rows.map((row) => {
          const copy = { ...(row as Record<string, unknown>) };
          delete copy['adjustmentMg'];
          return copy;
        });
      for (const field of [
        'byType',
        'byBrand',
        'byColor',
        'consumptionOverTime',
        'topSpools',
      ]) {
        legacy[field] = strip(legacy[field]);
      }
      analytics.getMaterials.and.returnValue(
        of(legacy as unknown as MaterialsResponse)
      );
      setup();

      expect(component.consumptionSeries().some((s) => s.signed)).toBeFalse();
      expect(component.byTypeData()[0].values['value']).toBe(60);
      expect(csvRows(component.byTypeCsv())[0]['Adjustments (g)']).toBe(0);
      expect(csvRows(component.topSpoolsCsv())[0]['Adjustments (g)']).toBe(0);
      expect(fixture.nativeElement.textContent).not.toContain('NaN');
    }));

    it('charts each group at its net, prints plus adjustments, never below zero', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const bars = component.byTypeData();
      // PLA: 60 g printed, 80 g added back. Its net is below zero, so it gets no bar at all
      // rather than a 0 g or negative one. Its numbers stay in the table.
      expect(bars.map((bar) => bar.label)).toEqual(['PETG', 'ABS']);
      // PETG was only ever weighed in: its bar is the adjustment, not a 0 g print total.
      expect(bars[0].values['value']).toBe(25);
      expect(bars[1].values['value']).toBe(25);
      expect(bars.every((bar) => bar.values['value'] > 0)).toBeTrue();
    }));

    it('spells out printed and adjusted grams in the group tooltip', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const abs = component.byTypeData().find((bar) => bar.label === 'ABS')!;
      expect(abs.fullLabel).toContain('25 g net');
      expect(abs.fullLabel).toContain('30 g printed');
      expect(abs.fullLabel).toContain('-5 g adjustments');
    }));

    it('lists every group in the table, net-zero ones included, with a signed Adjustments cell', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const rows = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '[data-testid="group-table-type"] tbody tr'
        )
      ).map((row) => row.textContent!.replace(/\s+/g, ' ').trim());
      expect(rows.length).toBe(3);
      expect(rows[0]).toContain('PLA');
      expect(rows[0]).toContain('-80 g');
      expect(rows[1]).toContain('+25 g');
    }));

    it('exports printed, adjustment and net grams per group', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const csv = component.byTypeCsv();
      expect(csv.columns).toEqual([
        'Group',
        'Prints',
        'Printed (g)',
        'Adjustments (g)',
        'Net (g)',
      ]);
      expect(csvRows(csv)).toEqual([
        {
          Group: 'PLA',
          Prints: 3,
          'Printed (g)': 60,
          'Adjustments (g)': -80,
          'Net (g)': 0,
        },
        {
          Group: 'PETG',
          Prints: 0,
          'Printed (g)': 0,
          'Adjustments (g)': 25,
          'Net (g)': 25,
        },
        {
          Group: 'ABS',
          Prints: 2,
          'Printed (g)': 30,
          'Adjustments (g)': -5,
          'Net (g)': 25,
        },
      ]);
    }));

    it('exports each period adjustment as its own row', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const csv = component.consumptionCsv();
      expect(csv.columns).toEqual([
        'Period',
        'Material type',
        'Filament (g)',
        'Source',
      ]);
      expect(csvRows(csv)).toEqual([
        {
          Period: '2026-07-01',
          'Material type': 'PLA',
          'Filament (g)': 40,
          Source: 'Prints',
        },
        {
          Period: '2026-07-01',
          'Material type': null,
          'Filament (g)': -15,
          Source: 'Adjustments',
        },
        {
          Period: '2026-07-02',
          'Material type': 'PLA',
          'Filament (g)': 20,
          Source: 'Prints',
        },
      ]);
    }));

    it('exports a spool adjustment and labels consumption as net', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const csv = component.topSpoolsCsv();
      expect(csv.columns).toEqual([
        'Spool',
        'Printed (g)',
        'Adjustments (g)',
        'Remaining (g)',
        'Net consumed (%)',
        'Net cost',
      ]);
      expect(csv.rows[0]).toEqual(['Acme PLA Red', 60, 12.5, 927.5, 7.25, 1.5]);
    }));

    it('shows a spool Adjustments column and net headings in the table', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const el = fixture.nativeElement as HTMLElement;
      const headings = Array.from(
        el.querySelectorAll('.materials-tab__spools thead th')
      ).map((th) => th.textContent!.trim());
      expect(headings).toContain('Adjustments');
      expect(headings).toContain('Net consumed');
      expect(headings).not.toContain('Used');
      expect(
        el.querySelector('.materials-tab__spools tbody tr')!.textContent
      ).toContain('+13 g');
    }));

    it('explains adjustments beside the consumption chart when there are any', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(of(adjusted()));
      setup();

      const note = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="adjustments-note"]'
      );
      expect(note?.textContent).toMatch(/weigh-in/i);
      expect(note?.textContent).toMatch(/negative/i);
    }));

    it('has no adjustments note when nothing was adjusted', fakeAsync(() => {
      setup();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="adjustments-note"]'
        )
      ).toBeNull();
    }));
  });

  describe('row cap (api#231)', () => {
    const emptied = (extra: Record<string, unknown>) =>
      ({
        ...response({
          byType: [],
          byBrand: [],
          byColor: [],
          consumptionOverTime: [],
          topSpools: [],
          runway: [],
        }),
        ...extra,
      }) as MaterialsResponse;

    const emptyMessages = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '[data-testid="chart-empty"]'
        )
      ).map((el) => el.textContent!.trim());

    it('explains an emptied tab from rowCapExceeded, even with no prints to exclude', fakeAsync(() => {
      // Adjustments alone can trip the cap; print coverage then has nothing to say.
      analytics.getMaterials.and.returnValue(
        of(
          emptied({
            rowCapExceeded: true,
            adjustmentCount: 0,
            coverage: { ...coverage, counted: 0, total: 0, exclusions: [] },
          })
        )
      );
      setup();

      expect(component.rowCapExceeded()).toBeTrue();
      expect(emptyMessages().length).toBeGreaterThan(0);
      expect(
        emptyMessages().every((message) => /too many/i.test(message))
      ).toBeTrue();
    }));

    it('falls back to the coverage exclusion when an older API omits the field', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(
        of(
          emptied({
            coverage: {
              ...coverage,
              exclusions: [{ reason: 'RowCapExceeded', count: 1 }],
            },
          })
        )
      );
      setup();

      expect(component.rowCapExceeded()).toBeTrue();
      expect(emptyMessages()[0]).toMatch(/too many/i);
    }));

    it('trusts rowCapExceeded: false over nothing else to go on', fakeAsync(() => {
      analytics.getMaterials.and.returnValue(
        of(emptied({ rowCapExceeded: false }))
      );
      setup();

      expect(component.rowCapExceeded()).toBeFalse();
      expect(emptyMessages()[0]).toBe(
        'No spool-tracked filament in this range yet.'
      );
    }));
  });

  it('fails the whole tab on an error', fakeAsync(() => {
    analytics.getMaterials.and.returnValue(throwError(() => new Error('boom')));
    setup();

    expect(component.state()).toBe('error');
  }));
});
