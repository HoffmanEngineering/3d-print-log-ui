import { HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
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
    spyOn(interceptor as any, 'getLocationSearch').and.returnValue('?devUserId=2');

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
});
