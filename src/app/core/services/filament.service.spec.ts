import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FilamentService } from './filament.service';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { environment } from 'src/environments/environment.unittest';

describe('FilamentServiceService', () => {
  let service: FilamentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FilamentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts the image as multipart form data', () => {
    const file = new File(['x'], 'spool.png', { type: 'image/png' });

    service.uploadFilamentImage('abc-123', file).subscribe();

    const req = httpMock.expectOne(
      `${environment.printLogApiUrl}/api/Filaments/abc-123/images`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('file')).toEqual(file);
    req.flush({
      id: 1,
      url: 'u',
      thumbnailUrl: 't',
      isDefault: true,
      displayOrder: 0,
    });
  });

  it('deletes the requested filament image', () => {
    service.deleteFilamentImage('abc-123', 7).subscribe();

    const req = httpMock.expectOne(
      `${environment.printLogApiUrl}/api/Filaments/abc-123/images/7`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('sends the complete ordered id list when reordering', () => {
    service.reorderFilamentImages('abc-123', [3, 1, 2]).subscribe();

    const req = httpMock.expectOne(
      `${environment.printLogApiUrl}/api/Filaments/abc-123/images/reorder`
    );
    expect(req.request.method).toBe('PUT');
    // The API requires an exact, duplicate-free set; a partial list is a 400.
    expect(req.request.body).toEqual([3, 1, 2]);
    req.flush(null);
  });

  it('sets the requested filament image as default', () => {
    service.setFilamentImageAsDefault('abc-123', 7).subscribe();

    const req = httpMock.expectOne(
      `${environment.printLogApiUrl}/api/Filaments/abc-123/images/7/set-as-default`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });
});
