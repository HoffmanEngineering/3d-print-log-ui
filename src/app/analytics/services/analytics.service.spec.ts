import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PrintStatus } from 'src/app/core/services/print.service';
import { environment } from 'src/environments/environment';
import { AnalyticsFilterValue } from '../models/analytics.models';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let http: HttpTestingController;

  const filter: AnalyticsFilterValue = {
    fromDate: '2026-07-01T00:00:00.000Z',
    toDate: '2026-07-31T00:00:00.000Z',
    timeZone: 'America/Chicago',
    printerIds: [3, 1],
    filamentIds: [],
    projectIds: [],
    statuses: [PrintStatus.Success],
    granularity: 'Auto',
    comparePrevious: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AnalyticsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the overview endpoint with every filter encoded', () => {
    service.getOverview(filter).subscribe();

    const req = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/analytics/overview`
    );

    expect(req.request.params.get('fromDate')).toBe(filter.fromDate);
    expect(req.request.params.get('toDate')).toBe(filter.toDate);
    expect(req.request.params.get('timeZone')).toBe('America/Chicago');
    expect(req.request.params.get('comparePrevious')).toBe('true');
    expect(req.request.params.getAll('printerIds')).toEqual(['3', '1']);
    expect(req.request.params.getAll('statuses')).toEqual([
      `${PrintStatus.Success}`,
    ]);
    req.flush(null);
  });

  it('omits null dates so the API treats the query as all-time', () => {
    service
      .getOverview({ ...filter, fromDate: null, toDate: null })
      .subscribe();

    const req = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/analytics/overview`
    );

    expect(req.request.params.has('fromDate')).toBeFalse();
    expect(req.request.params.has('toDate')).toBeFalse();
    req.flush(null);
  });

  it('requests activity with the same serialized filter as overview', () => {
    const expected = service.toHttpParams(filter);

    service.getActivity(filter).subscribe();

    const req = http.expectOne(
      (r) =>
        r.url === `${environment.printLogApiUrl}/api/analytics/activity` &&
        r.params.toString() === expected.toString()
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('requests printers from its own endpoint', () => {
    service.getPrinters(filter).subscribe();

    const req = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/analytics/printers`
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('requests materials from its own endpoint', () => {
    service.getMaterials(filter).subscribe();

    const req = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/analytics/materials`
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('requests costs from its own endpoint', () => {
    service.getCosts(filter).subscribe();

    const req = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/analytics/costs`
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('omits empty id arrays entirely rather than sending blanks', () => {
    service
      .getOverview({ ...filter, printerIds: [], statuses: [] })
      .subscribe();

    const req = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/analytics/overview`
    );

    expect(req.request.params.has('printerIds')).toBeFalse();
    expect(req.request.params.has('statuses')).toBeFalse();
    req.flush(null);
  });
});
