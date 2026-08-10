import { Injectable, inject } from '@angular/core';
import { LoggingService } from 'src/app/core/services/logging.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import {
  UserService,
  UserSummaryDto,
} from 'src/app/core/services/user.service';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import {
  PrintDetail,
  PrintDetailDTO,
  PrintService,
  PrintStatus,
} from '../../core/services/print.service';
import { CuraParserService } from '../services/integration/cura-parser.service';

export interface PrintDetailWithUser {
  print: PrintDetail | null;
  user: UserSummaryDto | null;
}

@Injectable()
export class PrintDetailResolverService {
  private readonly loggingService = inject(LoggingService);

  constructor(
    private printService: PrintService,
    private userService: UserService,
    private curaParserService: CuraParserService,
    private readonly newPrintStoreService: NewPrintStoreService
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printId = +route.paramMap.get('id');

    if (Number.isInteger(printId)) {
      return this.printService.getPrintDetail(printId).pipe(
        mergeMap((print) => {
          if (print === null) {
            const newDetails: PrintDetailWithUser = {
              print,
              user: null,
            };

            return of(newDetails);
          }
          return this.userService.getUserSummary(print.createdByUserId).pipe(
            // A deleted, deactivated, or private uploader must not cancel
            // navigation for an otherwise-public print (#66).
            catchError(() => of(null as UserSummaryDto | null)),
            map((user) => {
              const newDetails: PrintDetailWithUser = {
                print,
                user,
              };
              return newDetails;
            })
          );
        }),
        // getPrintDetail errors on any non-2xx, and a rejected resolver cancels
        // navigation and bounces the visitor to / (#66) — which is exactly what
        // a 404 did before this catch: the "Print not found" view was
        // unreachable for the case it exists to handle. Degrade to a null print
        // so the route still activates and the page can explain itself.
        catchError((error) => {
          const status = error?.status;
          if (status !== 403 && status !== 404) {
            // A 500 or a network failure is not "this print does not exist".
            // The page has one empty state, so it still renders, but the cause
            // must not be silently discarded.
            this.loggingService.logException(error);
          }
          return of({ print: null, user: null } as PrintDetailWithUser);
        })
      );
    }

    let defaultPrint: PrintDetail | null = null;

    // Check if there is a new print in the store. If so, use that:
    if (this.newPrintStoreService.hasNewPrint()) {
      defaultPrint = this.newPrintStoreService.getNewPrint();
      this.newPrintStoreService.clear();
    }

    if (this.sentFromCura(route)) {
      return this.curaParserService.parse(route.queryParamMap).then((print) => {
        const curaPrintDetail: PrintDetailWithUser = {
          print,
          user: null,
        };

        return curaPrintDetail;
      });
    }

    const emptyPrintDetail: PrintDetailWithUser = {
      print: defaultPrint,
      user: null,
    };

    return emptyPrintDetail;
  }
  sentFromCura(route: ActivatedRouteSnapshot) {
    return (
      route.queryParamMap.has('cura_version') &&
      route.queryParamMap.has('plugin_version')
    );
  }
}
