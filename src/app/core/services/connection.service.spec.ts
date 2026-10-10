import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import {
  Connection,
  ConnectionService,
  ConnectionStatus,
} from './connection.service';

describe('ConnectionService', () => {
  let service: ConnectionService;
  let httpMock: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api/Connections`;

  const wire = {
    id: '0d6c7a52-6a8e-4f52-9e1e-3f0c9b0b2a11',
    kind: 'moonraker',
    instanceId: 'voron-1',
    displayName: 'Voron in the garage',
    agentVersion: '0.1.0',
    printerId: 3,
    createdDate: '2026-10-01T12:00:00+00:00',
    lastSeenAt: '2026-10-10T08:30:00+00:00',
    status: 1,
    droppedNotifierEventCount: 0,
    lastDroppedNotifierEventAt: null,
    notifierNoticeDismissedAt: null,
    showNotifierNotice: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConnectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists one printer’s connections and parses their dates', () => {
    let result: Connection[] | undefined;
    service.getConnections(3).subscribe((c) => (result = c));

    const request = httpMock.expectOne(
      (r) => r.url === base && r.params.get('printerId') === '3'
    );
    expect(request.request.method).toBe('GET');
    request.flush([
      { ...wire, lastDroppedNotifierEventAt: '2026-10-10T08:00:00+00:00' },
    ]);

    expect(result?.length).toBe(1);
    expect(result![0].status).toBe(ConnectionStatus.Online);
    expect(result![0].lastSeenAt).toEqual(new Date('2026-10-10T08:30:00Z'));
    expect(result![0].createdDate).toEqual(new Date('2026-10-01T12:00:00Z'));
    expect(result![0].lastDroppedNotifierEventAt).toEqual(
      new Date('2026-10-10T08:00:00Z')
    );
    expect(result![0].notifierNoticeDismissedAt).toBeNull();
  });

  it('lists every connection when no printer is given', () => {
    service.getConnections().subscribe();

    const request = httpMock.expectOne((r) => r.url === base);
    expect(request.request.params.has('printerId')).toBeFalse();
    request.flush([]);
  });

  it('deletes a connection by its instance id, escaping it', () => {
    service.deleteConnection('voron 1/a').subscribe();

    const request = httpMock.expectOne(`${base}/voron%201%2Fa`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('dismisses the notifier notice on the server', () => {
    service.dismissNotifierNotice('voron-1').subscribe();

    const request = httpMock.expectOne(
      `${base}/voron-1/notifier-notice/dismiss`
    );
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
