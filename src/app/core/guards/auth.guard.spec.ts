import { inject, TestBed, waitForAsync } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { AuthGuard } from './auth.guard';
import { environment } from 'src/environments/environment';

describe('AuthGuard', () => {
  beforeEach(() => {
    const mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUser$',
    ]);
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
  });

  afterEach(() => {
    (environment as any).devAuthBypass = false;
  });

  it('should ...', inject([AuthGuard], (guard: AuthGuard) => {
    expect(guard).toBeTruthy();
  }));

  it('should return true immediately when devAuthBypass is true', (done) => {
    // Arrange: set bypass flag
    (environment as any).devAuthBypass = true;
    const guard = TestBed.inject(AuthGuard);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/prints' } as RouterStateSnapshot;

    // Act
    const result$ = guard.canActivate(route, state) as Observable<boolean>;

    // Assert
    result$.subscribe((value) => {
      expect(value).toBeTrue();
      done();
    });
  });
});
