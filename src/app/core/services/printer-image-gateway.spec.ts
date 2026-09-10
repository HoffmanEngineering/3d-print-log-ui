import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { PrinterThumbnailStore } from '../stores/printer-thumbnail-store.service';
import { PrinterService } from './printer.service';

/**
 * The URL contract for printer images, and the store invalidation that keeps every avatar
 * on the page from showing a stale photo for up to an hour after a change.
 */
describe('PrinterService image gateway', () => {
  let service: PrinterService;
  let httpMock: HttpTestingController;
  let store: jasmine.SpyObj<PrinterThumbnailStore>;

  const api = environment.printLogApiUrl;
  const PRINTER_ID = 7;
  const aFile = () => new File(['x'], 'printer.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    store = jasmine.createSpyObj<PrinterThumbnailStore>(
      'PrinterThumbnailStore',
      ['invalidate', 'thumbnailFor', 'noteLoadFailure']
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PrinterThumbnailStore, useValue: store },
      ],
    });

    service = TestBed.inject(PrinterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('carries the id it was built with', () => {
    expect(service.imageTarget(PRINTER_ID).id).toBe(PRINTER_ID);
  });

  it('leaves the id null on the create route', () => {
    expect(service.imageTarget(null).id).toBeNull();
  });

  it('posts the file as multipart form data', () => {
    service.uploadPrinterImage(PRINTER_ID, aFile()).subscribe();

    const req = httpMock.expectOne(`${api}/api/Printers/${PRINTER_ID}/images`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({});
  });

  it('sends the complete id set on reorder', () => {
    service.reorderPrinterImages(PRINTER_ID, [3, 1, 2]).subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Printers/${PRINTER_ID}/images/reorder`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([3, 1, 2]);
    req.flush(null);
  });

  it('deletes one image by id', () => {
    service.deletePrinterImage(PRINTER_ID, 5).subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Printers/${PRINTER_ID}/images/5`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('posts to the set-as-default route', () => {
    service.setPrinterImageAsDefault(PRINTER_ID, 5).subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Printers/${PRINTER_ID}/images/5/set-as-default`
    );
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  describe('thumbnail store invalidation', () => {
    // Driven through the gateway rather than the methods directly, because the gateway is
    // what the panel actually calls.
    const mutations: [string, () => Observable<unknown>, string][] = [
      [
        'upload',
        () =>
          service.imageTarget(PRINTER_ID).gateway.upload(PRINTER_ID, aFile()),
        `${api}/api/Printers/${PRINTER_ID}/images`,
      ],
      [
        'delete',
        () => service.imageTarget(PRINTER_ID).gateway.delete(PRINTER_ID, 5),
        `${api}/api/Printers/${PRINTER_ID}/images/5`,
      ],
      [
        'reorder',
        () => service.imageTarget(PRINTER_ID).gateway.reorder(PRINTER_ID, [1]),
        `${api}/api/Printers/${PRINTER_ID}/images/reorder`,
      ],
      [
        'setDefault',
        () => service.imageTarget(PRINTER_ID).gateway.setDefault(PRINTER_ID, 5),
        `${api}/api/Printers/${PRINTER_ID}/images/5/set-as-default`,
      ],
    ];

    mutations.forEach(([name, invoke, url]) => {
      it(`invalidates the store after a successful ${name}`, () => {
        invoke().subscribe();
        httpMock.expectOne(url).flush({});

        expect(store.invalidate).toHaveBeenCalled();
      });

      it(`does not invalidate when ${name} fails`, () => {
        // A failed mutation changed nothing, so throwing the cached map away would only
        // buy a refetch for every avatar on the page.
        invoke().subscribe({ error: () => undefined });
        httpMock
          .expectOne(url)
          .flush(null, { status: 500, statusText: 'Server Error' });

        expect(store.invalidate).not.toHaveBeenCalled();
      });
    });
  });
});
