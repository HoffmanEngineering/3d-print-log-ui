import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: { isAuthenticated$: unknown; login: jasmine.Spy };

  const canActivate = async (url = '/prints') => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
    );
    return isObservable(result) ? firstValueFrom(result) : result;
  };

  beforeEach(() => {
    auth = { isAuthenticated$: of(false), login: jasmine.createSpy('login') };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  afterEach(() => {
    (environment as { devAuthBypass?: boolean }).devAuthBypass = false;
  });

  it('lets a signed-in user through', async () => {
    auth.isAuthenticated$ = of(true);

    await expectAsync(canActivate()).toBeResolvedTo(true);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('blocks a signed-out visitor and sends them to log in, returning to the page', async () => {
    await expectAsync(canActivate('/printers/3')).toBeResolvedTo(false);
    expect(auth.login).toHaveBeenCalledOnceWith('/printers/3');
  });

  it('lets everyone through when the dev auth bypass is on', async () => {
    (environment as { devAuthBypass?: boolean }).devAuthBypass = true;

    await expectAsync(canActivate()).toBeResolvedTo(true);
    expect(auth.login).not.toHaveBeenCalled();
  });
});
