import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  MaterialCategory,
  MaterialCategoryService,
} from '../services/material-categories.service';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../services/printer-categories.service';
import { materialCategoriesResolver } from './material-categories.resolver';
import { printerCategoriesResolver } from './printer-categories.resolver';
import { resolveValue } from './testing/run-resolver';

describe('category resolvers', () => {
  it('materialCategoriesResolver resolves the material categories', async () => {
    const categories = [{ nickname: 'PLA' }] as MaterialCategory[];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MaterialCategoryService,
          useValue: { getMaterialCategories: () => of(categories) },
        },
      ],
    });

    await expectAsync(resolveValue(materialCategoriesResolver)).toBeResolvedTo(
      categories
    );
  });

  it('printerCategoriesResolver resolves the printer categories', async () => {
    const categories = [{ name: 'FDM' }] as unknown as PrinterCategory[];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PrinterCategoryService,
          useValue: { getPrinterCategories: () => of(categories) },
        },
      ],
    });

    await expectAsync(resolveValue(printerCategoriesResolver)).toBeResolvedTo(
      categories
    );
  });
});
