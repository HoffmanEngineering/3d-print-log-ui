import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

import { FeedService } from './feed.service';

describe('FeedService', () => {
  let service: FeedService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(FeedService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the feed since the given time and parses created dates', async () => {
    const from = new Date('2026-10-01T00:00:00.000Z');

    const feed = firstValueFrom(service.GetFeed(from));
    const request = http.expectOne(
      (r) => r.url === `${environment.printLogApiUrl}/api/Feed`
    );
    expect(request.request.params.get('fromDateTime')).toBe(
      '2026-10-01T00:00:00.000Z'
    );
    request.flush([
      { id: 1, title: 'Benchy', createdDate: '2026-10-02T12:00:00Z' },
    ]);

    const [print] = await feed;
    expect(print.title).toBe('Benchy');
    expect(print.createdDate).toEqual(new Date('2026-10-02T12:00:00Z'));
  });
});
