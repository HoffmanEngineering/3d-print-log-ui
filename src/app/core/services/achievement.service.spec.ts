import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  AchievementCatalog,
  EMPTY_PUBLIC_ACHIEVEMENTS,
  isBigMoment,
  PublicAchievements,
} from '../types/achievement';
import { AchievementService } from './achievement.service';

describe('AchievementService', () => {
  let service: AchievementService;
  let http: HttpTestingController;
  const base = `${environment.printLogApiUrl}/api`;
  const catalog: AchievementCatalog = {
    version: 1,
    hiddenCount: 4,
    families: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AchievementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('catalog and forUser send allow-anonymous-request', () => {
    service.catalog().subscribe();
    service.forUser(7).subscribe();

    const catalogReq = http.expectOne(`${base}/achievements/catalog`);
    const userReq = http.expectOne(`${base}/users/7/achievements`);
    expect(catalogReq.request.headers.get('allow-anonymous-request')).toBe(
      'true'
    );
    expect(userReq.request.headers.get('allow-anonymous-request')).toBe('true');
    catalogReq.flush(catalog);
    userReq.flush(EMPTY_PUBLIC_ACHIEVEMENTS);
  });

  it('catalog is fetched once across subscribers', () => {
    const seen: AchievementCatalog[] = [];
    service.catalog().subscribe((c) => seen.push(c));
    service.catalog().subscribe((c) => seen.push(c));

    http.expectOne(`${base}/achievements/catalog`).flush(catalog);
    service.catalog().subscribe((c) => seen.push(c));

    expect(seen.length).toBe(3);
  });

  it('forUser maps HTTP error to EMPTY_PUBLIC_ACHIEVEMENTS', () => {
    let result: PublicAchievements | undefined;
    service.forUser(9).subscribe((r) => (result = r));

    http
      .expectOne(`${base}/users/9/achievements`)
      .flush('nope', { status: 500, statusText: 'Server Error' });

    expect(result).toEqual(EMPTY_PUBLIC_ACHIEVEMENTS);
  });

  it('me and dismissHint call the authenticated endpoints', () => {
    service.me().subscribe();
    service.dismissHint('first-printer', 1).subscribe();

    http.expectOne(`${base}/achievements/me`).flush({});
    const dismiss = http.expectOne(`${base}/achievements/hint/dismiss`);
    expect(dismiss.request.method).toBe('POST');
    expect(dismiss.request.body).toEqual({ key: 'first-printer', tier: 1 });
    dismiss.flush(null);
  });

  describe('isBigMoment', () => {
    const cases: [string, Parameters<typeof isBigMoment>[0], boolean][] = [
      ['summary', { key: null, tier: null, summary: true, count: 12 }, true],
      [
        'first print',
        { key: 'first-print', tier: 1, summary: false, count: null },
        true,
      ],
      [
        'gold silk',
        { key: 'prints-logged', tier: 3, summary: false, count: null },
        true,
      ],
      [
        'glow tier',
        { key: 'print-hours', tier: 6, summary: false, count: null },
        true,
      ],
      [
        'silver',
        { key: 'prints-logged', tier: 2, summary: false, count: null },
        false,
      ],
      [
        'one-time',
        { key: 'first-printer', tier: 1, summary: false, count: null },
        false,
      ],
    ];
    for (const [name, input, expected] of cases) {
      it(`${name} → ${expected}`, () =>
        expect(isBigMoment(input)).toBe(expected));
    }
  });
});
