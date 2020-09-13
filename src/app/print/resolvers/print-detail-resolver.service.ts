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
} from '../../core/services/print.service';
import { CuraParserService } from '../services/integration/cura-parser.service';

export interface PrintDetailWithUser {
  print: PrintDetail;
  user: UserSummaryDto;
}

@Injectable()
export class PrintDetailResolverService
  implements Resolve<PrintDetailWithUser> {
  constructor(
    private printService: PrintService,
    private userService: UserService,
    private curaParserService: CuraParserService
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

    let defaultPrint: PrintDetail | null = null;
    if (this.sentFromCura(route)) {
      defaultPrint = this.curaParserService.parse(route.queryParamMap);
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
