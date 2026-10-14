import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../services/printer-categories.service';

export const printerCategoriesResolver: ResolveFn<PrinterCategory[]> = () =>
  inject(PrinterCategoryService).getPrinterCategories();
