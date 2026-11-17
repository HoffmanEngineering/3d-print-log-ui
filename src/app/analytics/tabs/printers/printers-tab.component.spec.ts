import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalyticsFilterStore } from '../../filters/analytics-filter.store';
import { PrintersResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { PrintersTabComponent } from './printers-tab.component';
import { AnalyticsFilterOptionsService } from '../../filters/analytics-filter-options.service';
import { signal } from '@angular/core';

const emptyCoverage = {
  population: 'printers',
  counted: 0,
  total: 0,
  undatedCount: 0,
  exclusions: [],
};

const response = (
  overrides: Partial<PrintersResponse> = {}
): PrintersResponse => ({
  from: null,
  to: null,
  timeZone: 'UTC',
  granularity: 'Day',
  currency: 'USD',
  printers: [
    {
      printerId: 1,
      name: 'Ender 3',
      isIdle: false,
      printCount: 4,
      successRatePercent: 75,
      printTimeSeconds: 7200,
      materialMg: 60000,
      materialMl: 12.5,
      avgDurationSeconds: 1800,
      cost: 10,
      maintenanceCost: 4,
      utilizationPercent: 12,
      costPerPrintHour: 2,
    },
  ],
  timeSeries: [
    {
      index: 0,
      localStart: '2026-07-02',
      printSecondsByPrinterId: { '1': 3600 },
    },
    {
      index: 1,
      localStart: '2026-07-01',
      printSecondsByPrinterId: { '1': 3600 },
    },
  ],
  fleetUtilizationPercent: {
    value: 12,
    previous: null,
    coverage: emptyCoverage,
  },
  maintenance: [
    {
      id: 'm1',
      printerId: 1,
      date: '2026-07-01',
      category: 'Nozzle',
      description: 'Swap',
      cost: 4,
    },
  ],
  coverage: emptyCoverage,
  ...overrides,
});

describe('PrintersTabComponent', () => {
  let fixture: ComponentFixture<PrintersTabComponent>;
  let component: PrintersTabComponent;
  let analytics: MockedObject<AnalyticsService>;

  /** Call after vi.useFakeTimers(): createTabData debounces the first load 250ms. */
  const setup = async () => {
    fixture = TestBed.createComponent(PrintersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = {
      getPrinters: vi.fn().mockName('AnalyticsService.getPrinters'),
    } as unknown as MockedObject<AnalyticsService>;
    analytics.getPrinters.mockReturnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [PrintersTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
        {
          provide: AnalyticsFilterOptionsService,
          useValue: { resinPrinterIds: signal(new Set([1])) },
        },
      ],
    }).compileComponents();
  });

  it('sorts the time series chronologically, not by response order', async () => {
    vi.useFakeTimers();
    await setup();

    expect(component.timeSeriesData().map((d) => d.fullLabel)).toEqual(
      component
        .timeSeriesData()
        .map((d) => d.fullLabel)
        .slice()
        .sort()
    );
  });

  it('builds one bar series per printer so the stack legend matches the table', async () => {
    vi.useFakeTimers();
    await setup();

    expect(component.printerSeries().map((s) => s.key)).toEqual(['1']);
    expect(component.printerSeries()[0].label).toBe('Ender 3');
  });

  it('reports empty when every printer is idle', async () => {
    vi.useFakeTimers();
    analytics.getPrinters.mockReturnValue(
      of(
        response({
          printers: [
            {
              printerId: 1,
              name: 'Ender 3',
              isIdle: true,
              printCount: 0,
              successRatePercent: null,
              printTimeSeconds: 0,
              materialMg: 0,
              avgDurationSeconds: null,
              cost: null,
              maintenanceCost: null,
              utilizationPercent: null,
              costPerPrintHour: null,
            },
          ],
        })
      )
    );
    await setup();

    expect(component.state()).toBe('empty');
  });

  it('totals maintenance from the per-printer figures, not the capped event list', async () => {
    vi.useFakeTimers();
    // The API caps the event LIST at 500 but computes maintenanceCost per printer from an
    // uncapped read. Here the list shows one 4.00 event while the printer's real total is
    // 900 — summing the list would report 4 and contradict the column beside it.
    analytics.getPrinters.mockReturnValue(
      of(
        response({
          printers: [
            {
              printerId: 1,
              name: 'Ender 3',
              isIdle: false,
              printCount: 4,
              successRatePercent: 75,
              printTimeSeconds: 7200,
              materialMg: 60000,
              avgDurationSeconds: 1800,
              cost: 10,
              maintenanceCost: 900,
              utilizationPercent: 12,
              costPerPrintHour: 2,
            },
          ],
        })
      )
    );
    await setup();

    expect(component.maintenanceTotal()).toBe(900);
  });

  it('reports no maintenance total when no printer has a known cost', async () => {
    vi.useFakeTimers();
    analytics.getPrinters.mockReturnValue(
      of(
        response({
          printers: [
            {
              printerId: 1,
              name: 'Ender 3',
              isIdle: false,
              printCount: 4,
              successRatePercent: 75,
              printTimeSeconds: 7200,
              materialMg: 60000,
              avgDurationSeconds: 1800,
              cost: 10,
              maintenanceCost: null,
              utilizationPercent: 12,
              costPerPrintHour: 2,
            },
          ],
        })
      )
    );
    await setup();

    // Null, not 0: "no readable price" is not "spent nothing".
    expect(component.maintenanceTotal()).toBeNull();
  });

  it('fails the whole tab on an error', async () => {
    vi.useFakeTimers();
    analytics.getPrinters.mockReturnValue(throwError(() => new Error('boom')));
    await setup();

    expect(component.state()).toBe('error');
  });

  // 3d-print-log-api#294: the mL column comes after every existing one.
  it('appends the resin mL to the comparison CSV', async () => {
    vi.useFakeTimers();
    await setup();

    const csv = component.comparisonCsv();
    expect(csv.columns[4]).toBe('Filament (g)');
    expect(csv.columns.at(-1)).toBe('Filament (mL)');
    expect(csv.rows[0][4]).toBe(60);
    expect(csv.rows[0].at(-1)).toBe(12.5);
  });

  it('passes the resin printers to the comparison', async () => {
    vi.useFakeTimers();
    await setup();

    expect(component.resinPrinterIds()).toEqual(new Set([1]));
  });
});
