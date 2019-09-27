import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PrinterService, PrinterSummary } from '../services/printer.service';

@Injectable({
  providedIn: 'root',
})
export class CurrentUserPrinterSummaryResolverService
  implements Resolve<PrinterSummary[]> {
  constructor(private printerService: PrinterService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.printerService.getCurrentUserPrinterSummaries();
  }
}
