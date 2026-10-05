import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { AccountEmailService } from './account-email.service';

describe('AccountEmailService', () => {
  let service: AccountEmailService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccountEmailService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the signed-in account address', () => {
    let result: unknown;
    service.get().subscribe((r) => (result = r));

    http
      .expectOne(`${environment.printLogApiUrl}/api/Users/me/email`)
      .flush({ email: 'ada@example.com', verified: true });

    expect(result).toEqual({ email: 'ada@example.com', verified: true });
  });
});
