import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: {
    isAuthenticated$: unknown;
    login: Mock;
  };

  const canActivate = async (url = '/prints') => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
    );
    return isObservable(result) ? firstValueFrom(result) : result;
  };

  beforeEach(() => {
    auth = { isAuthenticated$: of(false), login: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  afterEach(() => {
    (
      environment as {
        devAuthBypass?: boolean;
      }
    ).devAuthBypass = false;
  });

  it('lets a signed-in user through', async () => {
    auth.isAuthenticated$ = of(true);

    await expect(canActivate()).resolves.toEqual(true);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('blocks a signed-out visitor and sends them to log in, returning to the page', async () => {
    await expect(canActivate('/printers/3')).resolves.toEqual(false);
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(auth.login).toHaveBeenCalledWith('/printers/3');
  });

  it('lets everyone through when the dev auth bypass is on', async () => {
    (
      environment as {
        devAuthBypass?: boolean;
      }
    ).devAuthBypass = true;

    await expect(canActivate()).resolves.toEqual(true);
    expect(auth.login).not.toHaveBeenCalled();
  });
});
