import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import {
  PrintTag,
  PrintTagService,
  printTagErrorMessage,
} from './print-tag.service';

describe('PrintTagService', () => {
  let service: PrintTagService;
  let httpMock: HttpTestingController;
  const api = environment.printLogApiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrintTagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists the user’s tags', () => {
    let result: PrintTag[] | undefined;
    service.list().subscribe((t) => (result = t));

    const req = httpMock.expectOne(`${api}/api/Tags`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'a', name: 'Gifts', color: '#ff0000' }]);

    expect(result).toEqual([{ id: 'a', name: 'Gifts', color: '#ff0000' }]);
  });

  it('reads the per-tag stats', () => {
    let currency: string | null | undefined;
    service.stats().subscribe((s) => (currency = s.currency));

    const req = httpMock.expectOne(`${api}/api/Tags/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({ currency: 'USD', costUnavailable: false, tags: [] });

    expect(currency).toBe('USD');
  });

  it('creates a tag, sending a null colour rather than an empty one', () => {
    service.create({ name: 'Gifts', color: '' }).subscribe();

    const req = httpMock.expectOne(`${api}/api/Tags`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Gifts', color: null });
    req.flush({ id: 'a', name: 'Gifts', color: null });
  });

  it('updates and deletes a tag by id', () => {
    service.update('a', { name: 'Presents', color: '#00ff00' }).subscribe();
    const put = httpMock.expectOne(`${api}/api/Tags/a`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ name: 'Presents', color: '#00ff00' });
    put.flush({ id: 'a', name: 'Presents', color: '#00ff00' });

    service.remove('a').subscribe();
    const del = httpMock.expectOne(`${api}/api/Tags/a`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('replaces a print’s tags with the complete set of ids', () => {
    let result: PrintTag[] | undefined;
    service.setPrintTags(42, ['a', 'b']).subscribe((t) => (result = t));

    const req = httpMock.expectOne(`${api}/api/Prints/42/tags`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ tagIds: ['a', 'b'] });
    req.flush([{ id: 'a', name: 'A', color: null }]);

    expect(result?.length).toBe(1);
  });

  describe('printTagErrorMessage', () => {
    it('uses the API’s message for a conflict or a bad request', () => {
      const conflict = new HttpErrorResponse({
        status: 409,
        error: 'You already have a tag named "Gifts".',
      });
      expect(printTagErrorMessage(conflict)).toBe(
        'You already have a tag named "Gifts".'
      );
    });

    it('falls back to a generic message otherwise', () => {
      const failure = new HttpErrorResponse({ status: 500, error: null });
      expect(printTagErrorMessage(failure)).toBe(
        'Could not save the tag. Please try again.'
      );
    });
  });
});
