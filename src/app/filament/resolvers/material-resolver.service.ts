import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import {
  Material,
  MaterialService,
} from 'src/app/core/services/material.service';

@Injectable()
export class MaterialResolverService implements Resolve<Material[]> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.materialService.getMaterials();
  }
  constructor(private materialService: MaterialService) {}
}
