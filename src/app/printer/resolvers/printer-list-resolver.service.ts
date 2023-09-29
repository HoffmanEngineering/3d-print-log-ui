import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import {
  PrinterService,
  PrinterSummary,
} from '../../core/services/printer.service';

@Injectable()
export class PrinterListResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let defaultPageSize = 10;
    const savedPageSize = localStorage.getItem('printer_list_page_size');
    if (savedPageSize) {
      defaultPageSize = +savedPageSize;
    }

    return this.printerService.getCurrentUserPrinterSummaries(
      1,
      defaultPageSize
    );
  }
  constructor(private printerService: PrinterService) {}
}
