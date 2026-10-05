import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { EmailPreferencesApiService } from './email-preferences-api.service';

describe('EmailPreferencesApiService', () => {
  const base = `${environment.printLogApiUrl}/api/email`;
  let service: EmailPreferencesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmailPreferencesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('confirms an unsubscribe with the token in a header, never the URL', () => {
    let category: number | undefined;
    service
      .confirmUnsubscribe('TOKEN')
      .subscribe((r) => (category = r.category));

    const req = http.expectOne(`${base}/unsubscribe/confirm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Email-Token')).toBe('TOKEN');
    expect(req.request.urlWithParams).not.toContain('TOKEN');
    req.flush({ category: 24 });

    expect(category).toBe(24);
  });

  it('reads and updates preferences with the manage token', () => {
    service.read('MANAGE').subscribe();
    const read = http.expectOne(`${base}/preferences`);
    expect(read.request.method).toBe('GET');
    expect(read.request.headers.get('X-Email-Token')).toBe('MANAGE');
    read.flush({
      maskedEmail: 'a•••@example.com',
      all: true,
      onboarding: true,
      monthlyRecap: false,
      printerSilent: true,
    });

    const prefs = {
      all: true,
      onboarding: false,
      monthlyRecap: false,
      printerSilent: true,
    };
    service.update('MANAGE', prefs).subscribe();
    const update = http.expectOne(`${base}/preferences`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.headers.get('X-Email-Token')).toBe('MANAGE');
    expect(update.request.body).toEqual(prefs);
    update.flush({ maskedEmail: 'a•••@example.com', ...prefs });
  });

  it('sends no Authorization header', () => {
    service.read('MANAGE').subscribe();
    const req = http.expectOne(`${base}/preferences`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
