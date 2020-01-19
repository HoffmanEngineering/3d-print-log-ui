import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PrinterService, PrinterSummary } from '../services/printer.service';

@Injectable()
export class PrinterListResolverService implements Resolve<PrinterSummary[]> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.printerService.getCurrentUserPrinterSummaries();
  }
  constructor(private printerService: PrinterService) {}
}
