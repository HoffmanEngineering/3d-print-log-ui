import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { AuthService } from '../services/auth.service';
import {
  PrinterThumbnailStore,
  THUMBNAIL_TTL_MS,
} from './printer-thumbnail-store.service';

describe('PrinterThumbnailStore', () => {
  let store: PrinterThumbnailStore;
  let httpMock: HttpTestingController;
  let auth: { loggedIn: boolean | null };

  const url = `${environment.printLogApiUrl}/api/Printers/thumbnails`;

  const setUp = (loggedIn: boolean | null = true) => {
    auth = { loggedIn };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    store = TestBed.inject(PrinterThumbnailStore);
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpMock.verify();
  });

  it('does not call the API when signed out', () => {
    setUp(false);

    expect(store.thumbnailFor(1)).toBeNull();
    httpMock.expectNone(url);
  });

  // The whole-page shape of the same guarantee: a public print page renders an avatar
  // per printer it names, and a logged-out visitor must produce no request at all -
  // `httpMock.verify()` in afterEach is what proves "no request", not just "no map".
  it('issues nothing at all when many avatars read it while signed out', () => {
    setUp(false);

    [1, 2, 3, 4, 5].forEach((id) => expect(store.thumbnailFor(id)).toBeNull());

    httpMock.expectNone(url);
  });

  it('does not call the API before auth has resolved', () => {
    // `loggedIn` is null until Auth0 answers. Fetching then would just 401.
    setUp(null);

    store.thumbnailFor(1);
    httpMock.expectNone(url);
  });

  it('issues one request no matter how many callers ask', () => {
    setUp();

    store.thumbnailFor(1);
    store.thumbnailFor(2);
    store.thumbnailFor(3);

    httpMock.expectOne(url).flush([]);
  });

  it('returns the signed url for a printer that has one', () => {
    setUp();

    store.thumbnailFor(1);
    httpMock
      .expectOne(url)
      .flush([{ printerId: 1, thumbnailUrl: 'https://blob/a.webp?sig=x' }]);

    expect(store.thumbnailFor(1)).toBe('https://blob/a.webp?sig=x');
    expect(store.thumbnailFor(2)).toBeNull();
  });

  it('does not refetch when the user genuinely has no printer photos', () => {
    // An empty map is a real answer, not an unfetched one. Confusing the two turns
    // every avatar on the page into its own request, forever.
    setUp();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([]);

    store.thumbnailFor(1);
    httpMock.expectNone(url);
  });

  it('degrades to an empty map on failure and does not hammer the API', () => {
    setUp();

    store.thumbnailFor(1);
    httpMock
      .expectOne(url)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.thumbnailFor(1)).toBeNull();
    httpMock.expectNone(url);
  });

  it('refetches after the TTL elapses', fakeAsync(() => {
    setUp();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([{ printerId: 1, thumbnailUrl: 'a' }]);

    tick(THUMBNAIL_TTL_MS + 1);

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([{ printerId: 1, thumbnailUrl: 'b' }]);

    expect(store.thumbnailFor(1)).toBe('b');
  }));

  it('refetches immediately after invalidate', () => {
    setUp();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([{ printerId: 1, thumbnailUrl: 'a' }]);

    store.invalidate();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([{ printerId: 1, thumbnailUrl: 'b' }]);

    expect(store.thumbnailFor(1)).toBe('b');
  });

  it('clears the map when the user signs out', () => {
    setUp();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([{ printerId: 1, thumbnailUrl: 'a' }]);
    expect(store.thumbnailFor(1)).toBe('a');

    auth.loggedIn = false;

    expect(store.thumbnailFor(1)).toBeNull();
    httpMock.expectNone(url);
  });

  it('queues at most one refresh when many avatars report a dead url', async () => {
    setUp();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([
      { printerId: 1, thumbnailUrl: 'gone' },
      { printerId: 2, thumbnailUrl: 'gone' },
    ]);

    store.noteLoadFailure(1);
    store.noteLoadFailure(2);
    store.noteLoadFailure(1);

    await Promise.resolve();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([]);
  });

  it('ignores a load failure for a printer it never handed out a url for', () => {
    setUp();

    store.thumbnailFor(1);
    httpMock.expectOne(url).flush([{ printerId: 1, thumbnailUrl: 'a' }]);

    store.noteLoadFailure(99);

    store.thumbnailFor(1);
    httpMock.expectNone(url);
  });
});
