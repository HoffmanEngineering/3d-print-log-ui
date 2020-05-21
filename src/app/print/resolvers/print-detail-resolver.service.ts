import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import {
  UserService,
  UserSummaryDto,
} from 'src/app/core/services/user.service';
import {
  PrintDetail,
  PrintDetailDTO,
  PrintService,
  PrintStatus,
} from '../services/print.service';

export interface PrintDetailWithUser {
  print: PrintDetail;
  user: UserSummaryDto;
}

@Injectable()
export class PrintDetailResolverService
  implements Resolve<PrintDetailWithUser> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printId = +route.paramMap.get('id');

    if (Number.isInteger(printId)) {
      return this.printService.getPrintDetail(printId).pipe(
        mergeMap((print) => {
          return this.userService.getUserSummary(print.createdByUserId).pipe(
            map((user) => {
              const newDetails: PrintDetailWithUser = {
                print,
                user,
              };
              return newDetails;
            })
          );
        })
      );
    }

    return null;
  }

  constructor(
    private printService: PrintService,
    private userService: UserService
  ) {}
}
