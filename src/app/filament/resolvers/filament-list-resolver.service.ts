import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import {
  FilamentService,
  FilamentSummary,
} from '../../core/services/filament.service';

@Injectable()
export class FilamentListResolverService
  implements Resolve<PagedList<FilamentSummary>> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.filamentService.getCurrentUserFilamentSummaries();
  }
  constructor(private filamentService: FilamentService) {}
}
