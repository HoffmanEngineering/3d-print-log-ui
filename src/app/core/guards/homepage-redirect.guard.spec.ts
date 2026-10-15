import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { homepageRedirectGuard } from './homepage-redirect.guard';

describe('homepageRedirectGuard', () => {
  const redirectFor = async (loggedIn: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated$: of(loggedIn) } },
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
});
