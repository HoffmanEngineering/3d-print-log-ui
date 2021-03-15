import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import {
  FilamentDetail,
  FilamentService,
} from '../../core/services/filament.service';

@Injectable()
export class FilamentDetailResolverService implements Resolve<FilamentDetail> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const filamentId = route.paramMap.get('id');

    if (filamentId === 'new') {
      return null;
    }

    return this.filamentService.getFilamentDetail(filamentId);
  }
  constructor(private filamentService: FilamentService) {}
}
