import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { printerCategoryResolver } from './printer-category.resolver';
import { PrinterCategory } from '../services/printer-categories.service';

describe('printerCategoryResolver', () => {
  const executeResolver: ResolveFn<PrinterCategory[]> = (
    ...resolverParameters
  ) =>
    TestBed.runInInjectionContext(() =>
      printerCategoryResolver(...resolverParameters)
    );

  beforeEach(() => {
    const mockPrinterCategoryService = jasmine.createSpyObj(
      'PrinterCategoryService',
      ['getPrinterCategories']
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: 'PrinterCategoryService',
          useValue: mockPrinterCategoryService,
        },
      ],
    });
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
