import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';

@Injectable()
export class PrinterDetailResolverService  {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printerId = +route.paramMap.get('id');

    if (Number.isInteger(printerId)) {
      return this.printerService.getPrinterDetail(printerId);
    }

    return null;
  }
  constructor(private printerService: PrinterService) {}
}
