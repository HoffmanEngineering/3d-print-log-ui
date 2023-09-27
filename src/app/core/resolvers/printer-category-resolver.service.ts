import { ResolveFn } from '@angular/router';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../services/printer-categories.service';
import { inject } from '@angular/core';

export const PrinterCategoryResolverService: ResolveFn<PrinterCategory[]> = (
  route,
  state,
  printerCategoryService = inject(PrinterCategoryService)
) => {
  return printerCategoryService.getPrinterCategories();
};
