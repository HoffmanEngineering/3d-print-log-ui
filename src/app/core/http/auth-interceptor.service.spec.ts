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
  beforeEach(() => {
    const mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getTokenSilently$',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    });
  });

  afterEach(() => {
    (environment as any).devAuthBypass = false;
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

    const req = new HttpRequest('GET', 'https://localhost:5001/api/prints');
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

    const req = new HttpRequest('GET', 'https://localhost:5001/api/prints');
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
      'https://localhost:5001/api/public',
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
      'https://localhost:5001/api/public',
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
      'https://localhost:5001/api/Users/me/user-settings'
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
});
