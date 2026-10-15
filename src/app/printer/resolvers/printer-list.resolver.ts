import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import {
  PrinterService,
  PrinterSummarySimple,
} from '../../core/services/printer.service';

/** The first page of the printers list, at the page size the list last saved. */
export const printerListResolver: ResolveFn<
  PagedList<PrinterSummarySimple>
> = () => {
  let defaultPageSize = 10;
  const savedPageSize = localStorage.getItem('printer_list_page_size');
  if (savedPageSize) {
    defaultPageSize = +savedPageSize;
  }

  return inject(PrinterService).getCurrentUserPrinterSummaries(
    1,
    defaultPageSize
  );
};
