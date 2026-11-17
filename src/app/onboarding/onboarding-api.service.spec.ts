import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import {
  INELIGIBLE_STATUS,
  OnboardingApiService,
  ResendResult,
} from './onboarding-api.service';

describe('OnboardingApiService', () => {
  let service: OnboardingApiService;
  let http: HttpTestingController;
  const statusUrl = `${environment.printLogApiUrl}/api/Users/me/onboarding`;
  const resendUrl = `${environment.printLogApiUrl}/api/Users/me/verification-email`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(OnboardingApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('returns the status from the API', () => {
    const body = {
      onboardingEligible: true,
      createdDate: '2026-10-18T00:00:00Z',
      emailVerified: false,
    };
    let result: unknown;
    service.getStatus().subscribe((s) => (result = s));
    http.expectOne(statusUrl).flush(body);
    expect(result).toEqual(body);
  });

  for (const [code, text] of [
    [404, 'Not Found'],
    [500, 'Server Error'],
    [0, 'offline'],
  ] as const) {
    it(`maps a ${code} to INELIGIBLE_STATUS`, () => {
      let result: unknown;
      service.getStatus().subscribe((s) => (result = s));
      http.expectOne(statusUrl).flush(null, { status: code, statusText: text });
      expect(result).toBe(INELIGIBLE_STATUS);
    });
  }

  const cases: [number, string, ResendResult][] = [
    [204, 'No Content', 'sent'],
    [409, 'Conflict', 'already-verified'],
    [429, 'Too Many Requests', 'rate-limited'],
    [500, 'Server Error', 'failed'],
    [502, 'Bad Gateway', 'failed'],
  ];
  for (const [status, statusText, expected] of cases) {
    it(`maps resend ${status} to ${expected}`, () => {
      let result: ResendResult | undefined;
      service.resendVerificationEmail().subscribe((r) => (result = r));
      const req = http.expectOne(resendUrl);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status, statusText });
      expect(result).toBe(expected);
    });
  }
});
