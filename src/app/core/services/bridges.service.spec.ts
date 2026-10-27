import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { BridgesService } from './bridges.service';

describe('BridgesService', () => {
  let service: BridgesService;
  let http: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api/bridges`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BridgesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the bridges', () => {
    let result: unknown;
    service.list().subscribe((r) => (result = r));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    expect(result).toEqual([]);
  });

  it('renames a bridge with PATCH', () => {
    service.update(42, { name: 'Garage NAS', location: '' }).subscribe();
    const req = http.expectOne(`${base}/42`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Garage NAS', location: '' });
    req.flush({});
  });

  it('reads discovered and connected printers', () => {
    service.discovered(42).subscribe();
    service.printers(42).subscribe();
    expect(
      http.expectOne(`${base}/42/discovered-printers`).request.method
    ).toBe('GET');
    expect(http.expectOne(`${base}/42/printers`).request.method).toBe('GET');
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it('ignores with POST and unignores with DELETE on the same path', () => {
    service.ignore(42, 12).subscribe();
    service.unignore(42, 12).subscribe();
    const reqs = http.match(`${base}/42/discovered-printers/12/ignore`);
    expect(reqs.map((r) => r.request.method)).toEqual(['POST', 'DELETE']);
    reqs.forEach((r) => r.flush(null));
  });

  it('connects, disconnects and asks for a scan', () => {
    service.connect(42, { discoveredPrinterId: 12, printerId: 5 }).subscribe();
    const connect = http.expectOne(`${base}/42/printers`);
    expect(connect.request.method).toBe('POST');
    expect(connect.request.body).toEqual({
      discoveredPrinterId: 12,
      printerId: 5,
    });
    connect.flush({});

    service.disconnect(42, 7).subscribe();
    const disconnect = http.expectOne(`${base}/42/printers/7`);
    expect(disconnect.request.method).toBe('DELETE');
    disconnect.flush(null);

    service.scan(42).subscribe();
    const scan = http.expectOne(`${base}/42/scan`);
    expect(scan.request.method).toBe('POST');
    scan.flush({ scanRequestedAt: '2026-10-27T18:03:00+00:00' });
  });
});
