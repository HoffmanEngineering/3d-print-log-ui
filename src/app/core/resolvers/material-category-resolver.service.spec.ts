import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { MaterialCategoryResolverService } from './material-category-resolver.service';
import { MaterialCategory } from '../services/material-categories.service';

describe('materialCategoryResolver', () => {
  const executeResolver: ResolveFn<MaterialCategory[]> = (
    ...resolverParameters
  ) =>
    TestBed.runInInjectionContext(() =>
      MaterialCategoryResolverService(...resolverParameters)
    );

  beforeEach(() => {
    const mockMaterialCategoryService = jasmine.createSpyObj(
      'MaterialCategoryService',
      ['getMaterialCategories']
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: 'MaterialCategoryService',
          useValue: mockMaterialCategoryService,
        },
      ],
    });
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
