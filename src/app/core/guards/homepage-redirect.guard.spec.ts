import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { EMPTY, firstValueFrom, isObservable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { AuthService } from '../services/auth.service';
import { homepageRedirectGuard } from './homepage-redirect.guard';

describe('homepageRedirectGuard', () => {
  afterEach(() => {
    (environment as { devAuthBypass?: boolean }).devAuthBypass = false;
  });

  const redirectFor = async (
    loggedIn: boolean,
    isAuthenticated$ = of(loggedIn)
  ) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated$ } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      homepageRedirectGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/home-redirect' } as RouterStateSnapshot
      )
    );
    const tree = (
      isObservable(result) ? await firstValueFrom(result) : result
    ) as UrlTree;
    return TestBed.inject(Router).serializeUrl(tree);
  };

  it('sends a signed-in user to their prints', async () => {
    await expectAsync(redirectFor(true)).toBeResolvedTo('/prints');
  });

  it('sends a signed-out visitor to the home page', async () => {
    await expectAsync(redirectFor(false)).toBeResolvedTo('/home');
  });

  it('sends the dev auth bypass to prints even though auth never emits', async () => {
    // With the bypass there is no Auth0 client, so isAuthenticated$ is EMPTY.
    (environment as { devAuthBypass?: boolean }).devAuthBypass = true;

    await expectAsync(redirectFor(false, EMPTY)).toBeResolvedTo('/prints');
  });
});
