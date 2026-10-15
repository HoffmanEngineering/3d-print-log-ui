import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs/operators';
import {
  PrinterService,
  PrinterSummarySimple,
} from '../services/printer.service';

/** The signed-in user's active printers, for pickers and filters. */
export const currentUserPrinterSummariesResolver: ResolveFn<
  PrinterSummarySimple[]
> = () =>
  inject(PrinterService)
    .getCurrentUserPrinterSummaries(1, 100, undefined, false)
    .pipe(map((pagedResult) => pagedResult.items));
