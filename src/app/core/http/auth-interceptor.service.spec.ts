import { TestBed } from '@angular/core/testing';

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

  it('should be created', () => {
    const service: AuthInterceptorService = TestBed.inject(
      AuthInterceptorService
    );
    expect(service).toBeTruthy();
  });
});
