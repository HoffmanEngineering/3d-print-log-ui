import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PrinterDetail, PrinterService } from '../services/printer.service';

@Injectable()
export class PrinterDetailResolverService implements Resolve<PrinterDetail> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printerId = +route.paramMap.get('id');

    if (Number.isInteger(printerId)) {
      return this.printerService.getPrinterDetail(printerId);
    }

    return null;
  }
  constructor(private printerService: PrinterService) {}
}
