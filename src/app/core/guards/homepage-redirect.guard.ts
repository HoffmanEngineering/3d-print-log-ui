import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/** Redirects to the user's prints when signed in, and to the home page otherwise. */
export const homepageRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).isAuthenticated$.pipe(
    map((loggedIn) => router.createUrlTree([loggedIn ? '/prints' : '/home']))
  );
};
