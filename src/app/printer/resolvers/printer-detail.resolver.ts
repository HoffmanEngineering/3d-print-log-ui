import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';

/** The printer being edited, or `null` on the new-printer route. */
export const printerDetailResolver: ResolveFn<PrinterDetail | null> = (
  route
) => {
  const printerId = +route.paramMap.get('id');

  if (Number.isInteger(printerId)) {
    return inject(PrinterService).getPrinterDetail(printerId);
  }

  return null;
};
