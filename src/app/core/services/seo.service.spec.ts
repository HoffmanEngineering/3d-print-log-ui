import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';

import { SeoLookup, SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let http: HttpTestingController;
  const api = environment.printLogApiUrl;

  const body = {
    type: 'print',
    title: 'Benchy | 3D Print Log',
    description: 'A boat',
    canonicalUrl: 'https://www.3dprintlog.com/prints/42',
    image: {
      url: 'https://api.3dprintlog.com/api/Prints/42/social-image?v=3',
      width: 1200,
      height: 900,
      alt: 'Benchy',
    },
    author: { name: 'Chris', url: null },
    publishedAt: '2026-10-01T00:00:00Z',
    updatedAt: null,
    facts: [{ label: 'Printer', value: 'MK4' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const collect = (source: ReturnType<SeoService['forPrint']>): SeoLookup[] => {
    const results: SeoLookup[] = [];
    source.subscribe((r) => results.push(r));
    return results;
  };

  it('requests each kind of page from its own endpoint, anonymously', () => {
    collect(service.forPrint(42));
    collect(service.forProject('0b8c5d3e-1f2a-4b3c-9d4e-5f6a7b8c9d0e'));
    collect(service.forUser(7));

    for (const url of [
      `${api}/api/Prints/42/seo`,
      `${api}/api/Projects/0b8c5d3e-1f2a-4b3c-9d4e-5f6a7b8c9d0e/seo`,
      `${api}/api/Users/7/seo`,
    ]) {
      const req = http.expectOne(url);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('allow-anonymous-request')).toBe('true');
      req.flush(body);
    }
  });

  it('returns the metadata for a public page', () => {
    const results = collect(service.forPrint(42));
    http.expectOne(`${api}/api/Prints/42/seo`).flush(body);
    expect(results).toEqual([
      {
        kind: 'ok',
        seo: {
          type: 'print',
          title: 'Benchy | 3D Print Log',
          description: 'A boat',
          canonicalUrl: 'https://www.3dprintlog.com/prints/42',
          image: {
            url: 'https://api.3dprintlog.com/api/Prints/42/social-image?v=3',
            width: 1200,
            height: 900,
            alt: 'Benchy',
          },
          author: { name: 'Chris', url: null },
          publishedAt: '2026-10-01T00:00:00Z',
          updatedAt: null,
          facts: [{ label: 'Printer', value: 'MK4' }],
        },
      },
    ]);
  });

  it("treats SeoController's own 404 as a real 'not public' answer", () => {
    const results = collect(service.forPrint(42));
    // [ApiController] NotFound(): a problem body with no detail.
    http.expectOne(`${api}/api/Prints/42/seo`).flush(
      {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
        title: 'Not Found',
        status: 404,
        traceId: 'x',
      },
      { status: 404, statusText: 'Not Found' }
    );
    expect(results).toEqual([{ kind: 'not-public' }]);
  });

  // The API and UI release separately: an API without /seo answers every one of these
  // with its route-not-found 404, which must not mark public pages noindex.
  it('treats the route-not-found 404 of an API without /seo as unavailable', () => {
    const results = collect(service.forPrint(42));
    http.expectOne(`${api}/api/Prints/42/seo`).flush(
      {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
        title: 'Not Found',
        status: 404,
        detail:
          'No endpoint exists at this path. See https://www.3dprintlog.com/docs/api and https://api.3dprintlog.com/swagger/v1/swagger.json.',
        traceId: 'x',
      },
      { status: 404, statusText: 'Not Found' }
    );
    expect(results).toEqual([{ kind: 'unavailable' }]);
  });

  it('treats any other failure as unavailable', () => {
    const results = collect(service.forUser(7));
    http
      .expectOne(`${api}/api/Users/7/seo`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    const offline = collect(service.forUser(8));
    http.expectOne(`${api}/api/Users/8/seo`).error(new ProgressEvent('error'));
    expect(results).toEqual([{ kind: 'unavailable' }]);
    expect(offline).toEqual([{ kind: 'unavailable' }]);
  });

  it('treats a 200 without a title or canonical URL as unavailable', () => {
    const results = collect(service.forPrint(42));
    http
      .expectOne(`${api}/api/Prints/42/seo`)
      .flush({ ...body, canonicalUrl: null });
    expect(results).toEqual([{ kind: 'unavailable' }]);
  });

  it('drops an image whose URL is not absolute http(s), and sizes that are not positive', () => {
    const results = collect(service.forPrint(42));
    http.expectOne(`${api}/api/Prints/42/seo`).flush({
      ...body,
      image: { url: 'javascript:alert(1)', width: 1, height: 1, alt: null },
    });
    const sized = collect(service.forPrint(43));
    http.expectOne(`${api}/api/Prints/43/seo`).flush({
      ...body,
      image: { ...body.image, width: 0, height: -1 },
      facts: null,
    });

    expect((results[0] as any).seo.image).toBeNull();
    expect((sized[0] as any).seo.image).toEqual({
      url: body.image.url,
      width: null,
      height: null,
      alt: 'Benchy',
    });
    expect((sized[0] as any).seo.facts).toEqual([]);
  });

  it('accepts only the three known page types', () => {
    const results = collect(service.forPrint(42));
    http
      .expectOne(`${api}/api/Prints/42/seo`)
      .flush({ ...body, type: 'something-new' });
    expect(results).toEqual([{ kind: 'unavailable' }]);
  });
});
