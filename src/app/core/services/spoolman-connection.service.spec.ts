import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import {
  SpoolmanConnection,
  SpoolmanConnectionCreated,
  SpoolmanConnectionService,
  spoolmanConnectionLimit,
} from './spoolman-connection.service';

describe('SpoolmanConnectionService', () => {
  let service: SpoolmanConnectionService;
  let httpMock: HttpTestingController;
  const api = environment.printLogApiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SpoolmanConnectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists the user’s connections and reads zone-less timestamps as UTC', () => {
    let result: SpoolmanConnection[] | undefined;
    service.getConnections().subscribe((c) => (result = c));

    const req = httpMock.expectOne(`${api}/api/SpoolmanConnections`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'a',
        printerId: 3,
        printerName: 'Voron',
        name: 'Voron',
        // Read back from the database, the API serializes these without a zone.
        createdDate: '2026-10-01T12:00:00',
        lastSeenAt: '2026-10-10T08:30:00.123',
        state: 'active',
        disabledReason: null,
        disabledAt: null,
        revokedAt: null,
      },
    ]);

    expect(result?.length).toBe(1);
    expect(result![0].createdDate.toISOString()).toBe(
      '2026-10-01T12:00:00.000Z'
    );
    expect(result![0].lastSeenAt?.toISOString()).toBe(
      '2026-10-10T08:30:00.123Z'
    );
    expect(result![0].disabledAt).toBeNull();
  });

  it('keeps an explicit zone as sent', () => {
    let result: SpoolmanConnection[] | undefined;
    service.getConnections().subscribe((c) => (result = c));
    httpMock.expectOne(`${api}/api/SpoolmanConnections`).flush([
      {
        id: 'a',
        printerId: 3,
        printerName: 'Voron',
        name: 'Voron',
        createdDate: '2026-10-01T12:00:00+02:00',
        lastSeenAt: null,
        state: 'active',
        disabledReason: null,
        disabledAt: null,
        revokedAt: null,
      },
    ]);
    expect(result![0].createdDate.toISOString()).toBe(
      '2026-10-01T10:00:00.000Z'
    );
    expect(result![0].lastSeenAt).toBeNull();
  });

  it('connects a printer with a POST to its spoolman-connection', () => {
    let result: SpoolmanConnectionCreated | undefined;
    service.connect(7).subscribe((c) => (result = c));

    const req = httpMock.expectOne(`${api}/api/Printers/7/spoolman-connection`);
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'b',
      printerId: 7,
      printerName: 'Ender',
      name: 'Ender',
      createdDate: '2026-10-14T10:00:00Z',
      lastSeenAt: null,
      state: 'active',
      disabledReason: null,
      disabledAt: null,
      revokedAt: null,
      secret: 's3cr3t',
      serverUrl: 'https://printer-b:s3cr3t@api.3dprintlog.com/spoolman',
      configBlock:
        '[spoolman]\nserver: https://printer-b:s3cr3t@api.3dprintlog.com/spoolman\n',
    });

    expect(result?.configBlock).toBe(
      '[spoolman]\nserver: https://printer-b:s3cr3t@api.3dprintlog.com/spoolman\n'
    );
    expect(result?.createdDate.toISOString()).toBe('2026-10-14T10:00:00.000Z');
  });

  it('revokes a connection with a DELETE', () => {
    service.revoke('c-1').subscribe();
    const req = httpMock.expectOne(`${api}/api/SpoolmanConnections/c-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  describe('spoolmanConnectionLimit', () => {
    it('reads the limit from the API’s 403 problem', () => {
      const error = new HttpErrorResponse({
        status: 403,
        error: {
          title: 'Spoolman connection limit reached',
          detail: 'Free includes 1 connected printer.',
          code: 'spoolman_connection_limit',
          limit: 1,
        },
      });
      expect(spoolmanConnectionLimit(error)).toEqual({
        limit: 1,
        detail: 'Free includes 1 connected printer.',
      });
    });

    it('ignores any other error', () => {
      expect(
        spoolmanConnectionLimit(
          new HttpErrorResponse({ status: 403, error: { code: 'other' } })
        )
      ).toBeNull();
      expect(
        spoolmanConnectionLimit(new HttpErrorResponse({ status: 500 }))
      ).toBeNull();
      expect(spoolmanConnectionLimit(new Error('x'))).toBeNull();
    });
  });
});
