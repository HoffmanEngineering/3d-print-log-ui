import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';
import { isDevAnonymous } from '../utils/dev-anonymous';

@Injectable({
  providedIn: 'root',
})
export class AuthInterceptorService implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  protected getLocationSearch(): string {
    return window.location.search;
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.isTrustedApiUrl(req.url)) {
      // Untrusted origin: never attach interceptor credentials. Strip the
      // internal allow-anonymous-request sentinel so it cannot leak cross-origin.
      const passthroughReq = req.headers.has('allow-anonymous-request')
        ? req.clone({ headers: req.headers.delete('allow-anonymous-request') })
        : req;
      return next.handle(passthroughReq);
    }

    if (environment.devAuthBypass) {
      const search = this.getLocationSearch();

      if (isDevAnonymous(search)) {
        // Simulate an unauthenticated visitor (dev-only, gated on devAuthBypass).
        if (req.headers.get('allow-anonymous-request')) {
          const anonReq = req.clone({
            headers: req.headers.delete('allow-anonymous-request'),
          });
          return next.handle(anonReq);
        }
        // Mirror the real interceptor's pre-dispatch rethrow of the Auth0 token
        // error (a non-HttpErrorResponse) so UserSettingService's anonymous
        // fallback is exercised faithfully.
        return throwError(() => ({ error: 'missing_refresh_token' }));
      }

      const params = new URLSearchParams(search);
      const userId = params.get('devUserId') ?? '1';
      const devReq = req.clone({
        headers: req.headers
          .delete('allow-anonymous-request')
          .set('X-Dev-User-Id', userId),
      });
      return next.handle(devReq);
    }

    return this.auth.getTokenSilently$().pipe(
      mergeMap((token) => {
        const tokenReq = req.clone({
          headers: req.headers
            .delete('allow-anonymous-request')
            .set('Authorization', `Bearer ${token}`),
        });
        return next.handle(tokenReq);
      }),
      catchError((err) => {
        if (req.headers.get('allow-anonymous-request')) {
          const tokenReq = req.clone({
            headers: req.headers.delete('allow-anonymous-request'),
          });

          return next.handle(tokenReq);
        }

        return throwError(err);
      })
    );
  }

  /**
   * True only when `url` targets the configured Print Log API origin.
   * SSR-safe: resolves relative URLs against a fixed non-API base instead of
   * `window.location`, so relative/same-app requests are untrusted by
   * construction and the check never touches a browser global. Fails closed.
   */
  private isTrustedApiUrl(url: string): boolean {
    let apiOrigin: string;
    try {
      apiOrigin = new URL(environment.printLogApiUrl).origin;
    } catch {
      return false;
    }

    try {
      return new URL(url, 'http://origin-gate.invalid').origin === apiOrigin;
    } catch {
      return false;
    }
  }
}
