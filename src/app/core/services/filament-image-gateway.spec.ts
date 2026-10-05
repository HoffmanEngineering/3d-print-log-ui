import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { FilamentService } from './filament.service';

/**
 * The URL contract for material images.
 *
 * These assertions used to live in the images-panel spec. They moved here when the panel
 * became generic: the panel knows only the gateway interface, so a URL assertion there
 * would be testing the test double.
 */
describe('FilamentService image gateway', () => {
  let service: FilamentService;
  let httpMock: HttpTestingController;

  const api = environment.printLogApiUrl;
  const FILAMENT_ID = 'abc-123';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FilamentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('carries the id it was built with', () => {
    expect(service.imageTarget(FILAMENT_ID).id).toBe(FILAMENT_ID);
  });

  it('leaves the id null on the create route', () => {
    expect(service.imageTarget(null).id).toBeNull();
  });

  it('posts an upload as multipart form data', () => {
    const file = new File(['x'], 'spool.png', { type: 'image/png' });

    service
      .imageTarget(FILAMENT_ID)
      .gateway.upload(FILAMENT_ID, file)
      .subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Filaments/${FILAMENT_ID}/images`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({});
  });

  it('deletes one image by id', () => {
    service.imageTarget(FILAMENT_ID).gateway.delete(FILAMENT_ID, 5).subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Filaments/${FILAMENT_ID}/images/5`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('sends the complete ordered id list on reorder', () => {
    // The API validates the exact, duplicate-free set; a partial list is a 400.
    service
      .imageTarget(FILAMENT_ID)
      .gateway.reorder(FILAMENT_ID, [3, 1, 2])
      .subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Filaments/${FILAMENT_ID}/images/reorder`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([3, 1, 2]);
    req.flush(null);
  });

  it('posts to the set-as-default route', () => {
    service
      .imageTarget(FILAMENT_ID)
      .gateway.setDefault(FILAMENT_ID, 5)
      .subscribe();

    const req = httpMock.expectOne(
      `${api}/api/Filaments/${FILAMENT_ID}/images/5/set-as-default`
    );
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
