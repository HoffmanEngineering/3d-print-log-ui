import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintDetail, PrintService } from 'src/app/core/services/print.service';
import {
  UserService,
  UserSummaryDto,
} from 'src/app/core/services/user.service';

export interface PrintDetailWithUser {
  print: PrintDetail | null;
  user: UserSummaryDto | null;
}

/**
 * Loads a print plus its uploader's public summary for the print detail views.
 *
 * The degradation rules live HERE, in the service, rather than at each call
 * site. `/prints/:id` is public and used to be resolver-gated, where a rejected
 * resolver cancels navigation and bounces the visitor to `/` (#66). The route
 * no longer resolves this, but the same guarantee still has to hold for the
 * component's own `ngOnInit` fetch: nothing this returns may error, ever. It
 * emits `{ print: null, user: null }` instead, which the detail page renders as
 * its "Print not found" state.
 *
 * `PrintDetailResolverService` delegates here so the `/prints/:id/edit` route
 * and the view route cannot drift apart.
 */
@Injectable({
  providedIn: 'root',
})
export class PrintDetailLoaderService {
  private readonly printService = inject(PrintService);
  private readonly userService = inject(UserService);
  private readonly loggingService = inject(LoggingService);

  load(printId: number): Observable<PrintDetailWithUser> {
    return this.printService.getPrintDetail(printId).pipe(
      mergeMap((print) => {
        if (print === null) {
          return of({ print, user: null } as PrintDetailWithUser);
        }
        return this.userService.getUserSummary(print.createdByUserId).pipe(
          // A deleted, deactivated, or private uploader must not blank out an
          // otherwise-public print (#66).
          catchError(() => of(null as UserSummaryDto | null)),
          map((user) => ({ print, user }) as PrintDetailWithUser)
        );
      }),
      // getPrintDetail errors on any non-2xx. A plain 404 is "this print does
      // not exist", which the not-found view exists to explain. A 500 or a
      // network failure is NOT that, but the page has only one empty state, so
      // it renders the same thing either way — the difference is that the cause
      // is reported rather than silently discarded. Giving transient failures
      // their own retry UI is a real improvement and deliberately out of scope
      // here; this preserves the behavior the route had before the resolver was
      // removed, so the skeleton work cannot be blamed for a behavior change.
      catchError((error) => {
        const status = error?.status;
        if (status !== 403 && status !== 404) {
          this.loggingService.logException(error);
        }
        return of({ print: null, user: null } as PrintDetailWithUser);
      })
    );
  }
}
