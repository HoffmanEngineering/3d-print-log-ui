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
    if (environment.devAuthBypass) {
      const params = new URLSearchParams(this.getLocationSearch());
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
}
