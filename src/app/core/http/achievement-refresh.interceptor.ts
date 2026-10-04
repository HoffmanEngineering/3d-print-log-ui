import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { NotificationService } from '../services/notification.service';

/** Writes that can earn an achievement. */
const ACHIEVEMENT_WRITES =
  /\/api\/(Prints|Printers|Filaments|Projects|PrinterMaintenance|Users)\b/i;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * After a successful write that could earn a badge, asks for the unread count at once instead of
 * waiting up to 30 seconds for the next poll. The API grants before it answers, so the count
 * already includes anything just earned and the celebration plays immediately.
 */
@Injectable()
export class AchievementRefreshInterceptor implements HttpInterceptor {
  // Resolved lazily: NotificationService needs HttpClient, which needs the interceptors, so
  // injecting it directly would be a dependency cycle.
  private readonly injector = inject(Injector);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!WRITE_METHODS.has(req.method) || !ACHIEVEMENT_WRITES.test(req.url)) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.ok) {
          this.injector.get(NotificationService).refreshUnreadCount();
        }
      })
    );
  }
}
