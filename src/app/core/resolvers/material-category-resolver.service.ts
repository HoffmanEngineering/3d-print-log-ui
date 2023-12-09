import { ResolveFn } from '@angular/router';

import { inject } from '@angular/core';
import {
  MaterialCategory,
  MaterialCategoryService,
} from '../services/material-categories.service';

export const MaterialCategoryResolverService: ResolveFn<MaterialCategory[]> = (
  route,
  state,
  materialCategoryService = inject(MaterialCategoryService)
) => {
  return materialCategoryService.getMaterialCategories();
};
