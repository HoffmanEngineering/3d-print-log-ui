import {
  HttpHandler,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../services/auth.service';
import { AuthInterceptorService } from './auth-interceptor.service';

describe('AuthInterceptorService', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  const originalApiUrl = environment.printLogApiUrl;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getTokenSilently$',
    ]);
    mockAuthService.getTokenSilently$.and.returnValue(of('test-token'));

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    });
  });

  afterEach(() => {
    (environment as any).devAuthBypass = false;
    (environment as any).printLogApiUrl = originalApiUrl;
    sessionStorage.removeItem('devAnonymous');
  });

  it('should be created', () => {
    const service: AuthInterceptorService = TestBed.inject(
      AuthInterceptorService
    );
    expect(service).toBeTruthy();
  });

  it('should add X-Dev-User-Id header when devAuthBypass is true', (done) => {
    (environment as any).devAuthBypass = true;

    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue(
      '?devUserId=2'
    );

    const req = new HttpRequest(
      'GET',
      `${environment.printLogApiUrl}/api/prints`
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('X-Dev-User-Id')).toBe('2');
        expect(r.headers.get('Authorization')).toBeNull();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('should default X-Dev-User-Id to 1 when no devUserId param is present', (done) => {
    (environment as any).devAuthBypass = true;
    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue('');

    const req = new HttpRequest(
      'GET',
      `${environment.printLogApiUrl}/api/prints`
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('X-Dev-User-Id')).toBe('1');
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('should strip allow-anonymous-request header when devAuthBypass is true', (done) => {
    (environment as any).devAuthBypass = true;
    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue('');

    const req = new HttpRequest(
      'GET',
      `${environment.printLogApiUrl}/api/public`,
      null,
      {
        headers: new HttpHeaders({ 'allow-anonymous-request': 'true' }),
      }
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('allow-anonymous-request')).toBeNull();
        expect(r.headers.get('X-Dev-User-Id')).toBe('1');
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('dispatches allow-anonymous requests without a dev user when devUserId=anonymous', (done) => {
    (environment as any).devAuthBypass = true;
    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue(
      '?devUserId=anonymous'
    );

    const req = new HttpRequest(
      'GET',
      `${environment.printLogApiUrl}/api/public`,
      null,
      { headers: new HttpHeaders({ 'allow-anonymous-request': 'true' }) }
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('allow-anonymous-request')).toBeNull();
        expect(r.headers.get('X-Dev-User-Id')).toBeNull();
        expect(r.headers.get('Authorization')).toBeNull();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('errors before dispatch for auth-required requests when devUserId=anonymous', (done) => {
    (environment as any).devAuthBypass = true;
    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue(
      '?devUserId=anonymous'
    );

    let handled = false;
    const req = new HttpRequest(
      'GET',
      `${environment.printLogApiUrl}/api/Users/me/user-settings`
    );
    const next: HttpHandler = {
      handle: () => {
        handled = true;
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe({
      next: () => fail('should not emit a response'),
      error: (err) => {
        expect(handled).toBeFalse();
        expect(err.error).toBe('missing_refresh_token');
        done();
      },
    });
  });

  it('attaches the bearer token for trusted API-origin requests', (done) => {
    mockAuthService.getTokenSilently$.and.returnValue(of('test-token'));
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest(
      'GET',
      `${environment.printLogApiUrl}/api/prints`
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBe('Bearer test-token');
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('does not attach a token to untrusted (non-API) origins and never requests one', (done) => {
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest(
      'GET',
      'https://acct.blob.core.windows.net/container/img.png'
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        expect(mockAuthService.getTokenSilently$).not.toHaveBeenCalled();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('strips allow-anonymous-request before forwarding an untrusted request', (done) => {
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest(
      'GET',
      'https://acct.blob.core.windows.net/container/img.png',
      null,
      { headers: new HttpHeaders({ 'allow-anonymous-request': 'true' }) }
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('allow-anonymous-request')).toBeNull();
        expect(r.headers.get('Authorization')).toBeNull();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('treats relative URLs as untrusted', (done) => {
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest('GET', '/assets/logo.png');
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        expect(mockAuthService.getTokenSilently$).not.toHaveBeenCalled();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('fails closed on a non-parseable URL', (done) => {
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest('GET', 'http://[invalid');
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        expect(mockAuthService.getTokenSilently$).not.toHaveBeenCalled();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('fails closed when the configured API origin is malformed', (done) => {
    // Build the URL from the real origin BEFORE breaking the config, so the
    // request would be trusted if the API URL were parseable. afterEach restores it.
    const trustedUrl = `${environment.printLogApiUrl}/api/prints`;
    (environment as any).printLogApiUrl = 'http://[invalid';
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest('GET', trustedUrl);
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        expect(mockAuthService.getTokenSilently$).not.toHaveBeenCalled();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe({ error: (e) => fail(e) });
  });

  it('treats a lookalike host as untrusted', (done) => {
    const interceptor = TestBed.inject(AuthInterceptorService);

    // API host as a subdomain label of an attacker domain must NOT be trusted.
    const req = new HttpRequest(
      'GET',
      `https://${new URL(environment.printLogApiUrl).host}.evil.example/api/prints`
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        expect(mockAuthService.getTokenSilently$).not.toHaveBeenCalled();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe({ error: (e) => fail(e) });
  });

  it('treats protocol-relative URLs as untrusted', (done) => {
    const interceptor = TestBed.inject(AuthInterceptorService);

    const req = new HttpRequest(
      'GET',
      '//acct.blob.core.windows.net/container/img.png'
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        expect(mockAuthService.getTokenSilently$).not.toHaveBeenCalled();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe({ error: (e) => fail(e) });
  });

  it('short-circuits above dev logic for untrusted URLs in dev mode', (done) => {
    (environment as any).devAuthBypass = true;
    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue(
      '?devUserId=2'
    );

    const req = new HttpRequest(
      'GET',
      'https://acct.blob.core.windows.net/container/img.png'
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('X-Dev-User-Id')).toBeNull();
        expect(r.headers.get('Authorization')).toBeNull();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });

  it('does not throw for untrusted URLs in dev-anonymous mode', (done) => {
    (environment as any).devAuthBypass = true;
    const interceptor = TestBed.inject(AuthInterceptorService);
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue(
      '?devUserId=anonymous'
    );

    const req = new HttpRequest(
      'GET',
      'https://acct.blob.core.windows.net/container/img.png'
    );
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('Authorization')).toBeNull();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe({
      error: () => fail('untrusted request must not throw'),
    });
  });
});
