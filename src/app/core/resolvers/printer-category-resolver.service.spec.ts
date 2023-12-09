import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { PrinterCategoryResolverService } from './printer-category-resolver.service';
import { PrinterCategory } from '../services/printer-categories.service';

describe('PrinterCategoryResolverService', () => {
  const executeResolver: ResolveFn<PrinterCategory[]> = (
    ...resolverParameters
  ) =>
    TestBed.runInInjectionContext(() =>
      PrinterCategoryResolverService(...resolverParameters)
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
