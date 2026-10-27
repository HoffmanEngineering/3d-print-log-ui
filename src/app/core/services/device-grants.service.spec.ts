import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { DeviceGrant, DeviceGrantsService } from './device-grants.service';

describe('DeviceGrantsService', () => {
  let service: DeviceGrantsService;
  let http: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api/device-grants`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DeviceGrantsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the paired devices', () => {
    const grants: DeviceGrant[] = [
      {
        id: 7,
        deviceId: '0b6f7f3e-6f0e-4c5b-9a43-0a3a2f7d1e11',
        name: 'printlog-bridge on voron',
        clientId: 'abc',
        scopes: ['prints:write'],
        createdAt: '2026-10-20T10:00:00+00:00',
        pairedAt: '2026-10-20T10:00:00+00:00',
        lastUsedAt: null,
      },
    ];
    let result: DeviceGrant[] | undefined;
    service.list().subscribe((r) => (result = r));

    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush(grants);
    expect(result).toEqual(grants);
  });

  it('revokes a paired device by id', () => {
    let done = false;
    service.revoke(7).subscribe(() => (done = true));

    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBeTrue();
  });
});
