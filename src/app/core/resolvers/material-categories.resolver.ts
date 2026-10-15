import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  MaterialCategory,
  MaterialCategoryService,
} from '../services/material-categories.service';

export const materialCategoriesResolver: ResolveFn<MaterialCategory[]> = () =>
  inject(MaterialCategoryService).getMaterialCategories();
