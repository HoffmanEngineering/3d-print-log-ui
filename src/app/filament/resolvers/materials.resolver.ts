import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  Material,
  MaterialService,
} from 'src/app/core/services/material.service';

export const materialsResolver: ResolveFn<Material[]> = () =>
  inject(MaterialService).getMaterials();
