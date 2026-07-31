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
import { PrintersResponse } from '../../models/analytics.models';
import { AnalyticsService } from '../../services/analytics.service';
import { PrintersTabComponent } from './printers-tab.component';

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
  let analytics: jasmine.SpyObj<AnalyticsService>;

  /** Synchronous, to be called inside fakeAsync: createTabData debounces the first load 250ms. */
  const setup = () => {
    fixture = TestBed.createComponent(PrintersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getPrinters',
    ]);
    analytics.getPrinters.and.returnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [PrintersTabComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        AnalyticsFilterStore,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  it('sorts the time series chronologically, not by response order', fakeAsync(() => {
    setup();

    expect(component.timeSeriesData().map((d) => d.fullLabel)).toEqual(
      component
        .timeSeriesData()
        .map((d) => d.fullLabel)
        .slice()
        .sort()
    );
  }));

  it('builds one bar series per printer so the stack legend matches the table', fakeAsync(() => {
    setup();

    expect(component.printerSeries().map((s) => s.key)).toEqual(['1']);
    expect(component.printerSeries()[0].label).toBe('Ender 3');
  }));

  it('reports empty when every printer is idle', fakeAsync(() => {
    analytics.getPrinters.and.returnValue(
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
    setup();

    expect(component.state()).toBe('empty');
  }));

  it('fails the whole tab on an error', fakeAsync(() => {
    analytics.getPrinters.and.returnValue(throwError(() => new Error('boom')));
    setup();

    expect(component.state()).toBe('error');
  }));
});
