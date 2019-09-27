import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import {
  PrintDetail,
  PrintDetailDTO,
  PrintService,
  PrintStatus,
} from '../services/print.service';

@Injectable()
export class PrintDetailResolverService implements Resolve<PrintDetail> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printId = +route.paramMap.get('id');

    if (Number.isInteger(printId)) {
      return this.printService.getPrintDetail(printId);
    }

    return null;
  }

  constructor(private printService: PrintService) {}
}
