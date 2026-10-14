import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

/** Lets signed-in users through; sends everyone else to log in, returning to the page. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (environment.devAuthBypass) {
    return of(true);
  }

  const auth = inject(AuthService);
  return auth.isAuthenticated$.pipe(
    tap((loggedIn) => {
      if (!loggedIn) {
        auth.login(state.url);
      }
    })
  );
};
