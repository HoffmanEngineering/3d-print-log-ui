import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';

import { map } from 'rxjs/operators';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintService,
} from '../../core/services/print.service';
import { PrintDetailWithUser } from './print-detail-resolver.service';

@Injectable()
export class CopyPrintDetailResolverService
  implements Resolve<PrintDetailWithUser> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printId = +route.paramMap.get('id');

    if (Number.isInteger(printId)) {
      return this.printService.getPrintDetail(printId).pipe(
        map((print) => {
          const cleanedFilamentUsage = print.filamentUsage.map(
            (printFilament) => {
              return { ...printFilament, id: EMPTY_GUID };
            }
          );
          const cleanedPrint: PrintDetail = {
            ...print,
            id: null,
            images: [],
            filamentUsage: cleanedFilamentUsage,
          };

          const newDetails: PrintDetailWithUser = {
            print: cleanedPrint,
            user: null,
          };

          return newDetails;
        })
      );
    }

    const emptyDetail: PrintDetailWithUser = {
      print: null,
      user: null,
    };
    return emptyDetail;
  }

  constructor(private printService: PrintService) {}
}
