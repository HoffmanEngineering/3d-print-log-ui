import { async, inject, TestBed } from '@angular/core/testing';

import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../services/auth.service';
import { HomepageRedirectGuard } from './homepage-redirect.guard';

describe('HomepageRedirectGuard', () => {
  beforeEach(() => {
    const mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUser$',
    ]);

    TestBed.configureTestingModule({
      providers: [
        HomepageRedirectGuard,
        { provide: AuthService, useValue: mockAuthService },
      ],
      imports: [RouterTestingModule],
    });
  });

  it('should ...', inject(
    [HomepageRedirectGuard],
    (guard: HomepageRedirectGuard) => {
      expect(guard).toBeTruthy();
    }
  ));
});
