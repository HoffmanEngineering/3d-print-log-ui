import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Redirects to the user's prints when signed in, and to the home page otherwise.
 * With the dev auth bypass there is no Auth0 client, so `isAuthenticated$`
 * completes without a value and the navigation would be cancelled: treat the
 * bypass as signed in, as `authGuard` does.
 */
export const homepageRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (environment.devAuthBypass) {
    return router.createUrlTree(['/prints']);
  }
  return inject(AuthService).isAuthenticated$.pipe(
    map((loggedIn) => router.createUrlTree([loggedIn ? '/prints' : '/home']))
  );
};
