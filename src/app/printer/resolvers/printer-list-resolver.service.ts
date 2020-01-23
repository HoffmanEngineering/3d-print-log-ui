import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { PrinterService, PrinterSummary } from '../services/printer.service';

@Injectable()
export class PrinterListResolverService
  implements Resolve<PagedList<PrinterSummary>> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.printerService.getCurrentUserPrinterSummaries();
  }
  constructor(private printerService: PrinterService) {}
}
