import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private auth: AuthService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    if (environment.devAuthBypass) {
      return of(true);
    }

    return this.auth.isAuthenticated$.pipe(
      tap((loggedIn) => {
        if (!loggedIn) {
          this.auth.login(state.url);
        }
      })
    );
  }
}
