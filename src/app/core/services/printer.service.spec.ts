import { TestBed } from '@angular/core/testing';

import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PrinterDetail, PrinterService } from './printer.service';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { environment } from 'src/environments/environment';

describe('PrinterService', () => {
  let service: PrinterService;
  let httpMock: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api/Printers`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PrinterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads a spool into one slot', () => {
    let loaded: unknown;
    service
      .loadSlot(3, 2, 'f-1', 'T2')
      .subscribe((result) => (loaded = result));

    const request = httpMock.expectOne(`${base}/3/slots/2`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      filamentId: 'f-1',
      slotLabel: 'T2',
    });
    request.flush([{ id: 'pf-1', slot: 2, slotLabel: 'T2', filament: null }]);

    expect(loaded).toEqual([
      jasmine.objectContaining({ slot: 2, slotLabel: 'T2' }),
    ]);
  });

  it('unloads one slot', () => {
    service.unloadSlot(3, 1).subscribe();

    const request = httpMock.expectOne(`${base}/3/slots/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('sends the slot count when saving a printer', () => {
    const printer = {
      id: 3,
      name: 'U1',
      make: 'Snapmaker',
      model: 'U1',
      description: '',
      nozzleDiameter: 0.4,
      filamentDiameter: 1.75,
      beamDiameter: null,
      isActive: true,
      loadedFilaments: [],
      category: { nickname: 'FFF' },
      slotCount: 4,
    } as unknown as PrinterDetail;

    service.updatePrinter(printer).subscribe();

    const request = httpMock.expectOne(`${base}/3`);
    expect(request.request.body.slotCount).toBe(4);
    request.flush({});
  });
});
