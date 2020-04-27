import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { map } from 'rxjs/operators';
import {
  PrintDetail,
  PrintDetailDTO,
  PrintService,
  PrintStatus,
} from '../services/print.service';

@Injectable()
export class CopyPrintDetailResolverService implements Resolve<PrintDetail> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printId = +route.paramMap.get('id');

    if (Number.isInteger(printId)) {
      return this.printService.getPrintDetail(printId).pipe(
        map((print) => {
          const cleanedPrint: PrintDetail = { ...print, id: null, images: [] };
          return cleanedPrint;
        })
      );
    }

    return null;
  }

  constructor(private printService: PrintService) {}
}
