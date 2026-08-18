import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  BulkPrintResult,
  PrintService,
  PrintStatus,
  PrintViewStatus,
} from './print.service';
import { environment } from 'src/environments/environment';

describe('PrintService', () => {
  let service: PrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Scoped so httpMock.verify() applies only to the requests these specs make; the rest of the
  // file exercises pure calculation helpers that issue none.
  describe('getPrintSummaries', () => {
    let httpMock: HttpTestingController;

    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    const emptyPage = {
      items: [],
      pageNumber: 1,
      totalPages: 0,
      totalCount: 0,
    };

    it('sends a half-open date range when one is supplied', () => {
      service
        .getPrintSummaries(
          1,
          10,
          '',
          null,
          [],
          [],
          undefined,
          undefined,
          undefined,
          undefined,
          {
            fromDate: '2026-07-01T00:00:00.000Z',
            toDate: '2026-07-02T00:00:00.000Z',
          }
        )
        .subscribe();

      const request = httpMock.expectOne((candidate) =>
        candidate.url.endsWith('/api/Prints/summary')
      );

      expect(request.request.params.get('fromDate')).toBe(
        '2026-07-01T00:00:00.000Z'
      );
      expect(request.request.params.get('toDate')).toBe(
        '2026-07-02T00:00:00.000Z'
      );
      request.flush(emptyPage);
    });

    it('omits the range parameters entirely when none is supplied', () => {
      service.getPrintSummaries(1, 10).subscribe();

      const request = httpMock.expectOne((candidate) =>
        candidate.url.endsWith('/api/Prints/summary')
      );

      expect(request.request.params.has('fromDate')).toBeFalse();
      expect(request.request.params.has('toDate')).toBeFalse();
      request.flush(emptyPage);
    });
  });

  describe('calculateElectricityCost', () => {
    it('returns invalid with empty message when printTimeSeconds is null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: null,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('');
    });

    it('returns invalid with empty message when printTimeSeconds is 0', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 0,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('');
    });

    it('returns invalid with rate message when kwhRate is null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: null,
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('(Electricity rate not set)');
    });

    it('returns invalid with wattage message when both wattages are null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: '0.15',
        printerWattageW: null,
        defaultWattageW: null,
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('(Printer wattage not set)');
    });

    it('calculates correctly with printer wattage', () => {
      // 200W × 1h / 1000 × $0.15/kWh = $0.03
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: null,
        currencySymbol: '$',
      });
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.cost.value).toBeCloseTo(0.03, 4);
        expect(result.usesDefaultWattage).toBeFalse();
        expect(result.wattageW).toBe(200);
        expect(result.printTimeHours).toBeCloseTo(1, 4);
      }
    });

    it('calculates correctly using default wattage when printer wattage is null', () => {
      // 150W × 2h / 1000 × $0.20/kWh = $0.06
      const result = service.calculateElectricityCost({
        printTimeSeconds: 7200,
        kwhRate: '0.20',
        printerWattageW: null,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.cost.value).toBeCloseTo(0.06, 4);
        expect(result.usesDefaultWattage).toBeTrue();
        expect(result.wattageW).toBe(150);
      }
    });
  });

  // Scoped so httpMock.verify() applies only to the requests these specs make.
  describe('bulk endpoints', () => {
    let httpMock: HttpTestingController;

    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('posts a bulk update with numeric enum values', () => {
      const result: BulkPrintResult = { succeeded: [1, 2], failed: [] };
      let actual: BulkPrintResult | undefined;

      service
        .bulkUpdatePrints({
          printIds: [1, 2],
          status: PrintStatus.Success,
          projectId: 'a-project-id',
        })
        .subscribe((r) => (actual = r));

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Prints/bulk-update`
      );
      expect(req.request.method).toBe('POST');
      // The API registers no string enum converter - enums must go over the wire as numbers.
      expect(req.request.body).toEqual({
        printIds: [1, 2],
        status: 3,
        projectId: 'a-project-id',
      });

      req.flush(result);
      expect(actual).toEqual(result);
    });

    it('sends viewStatus as a number too', () => {
      // status was already covered; viewStatus is a separate enum and would
      // serialize just as wrongly on its own if a converter were added.
      service
        .bulkUpdatePrints({ printIds: [1], viewStatus: PrintViewStatus.Public })
        .subscribe();

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Prints/bulk-update`
      );
      expect(req.request.body).toEqual({ printIds: [1], viewStatus: 1 });
      req.flush({ succeeded: [1], failed: [] });
    });

    it('posts a bulk delete', () => {
      const result: BulkPrintResult = {
        succeeded: [1],
        failed: [{ id: 2, reason: 'Forbidden' }],
      };
      let actual: BulkPrintResult | undefined;

      service.bulkDeletePrints([1, 2]).subscribe((r) => (actual = r));

      const req = httpMock.expectOne(
        `${environment.printLogApiUrl}/api/Prints/bulk-delete`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ printIds: [1, 2] });

      req.flush(result);
      expect(actual).toEqual(result);
    });
  });
});
