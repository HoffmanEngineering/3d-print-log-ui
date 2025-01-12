import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from '../../core/services/filament.service';
import { map } from 'rxjs';

@Injectable()
export class FilamentListResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.filamentService
      .getCurrentUserFilamentSummaries(
        1,
        100,
        FilamentSortColumns.DisplayName,
        SortDirection.Asc
      )
      .pipe(map((pagedResult) => pagedResult.items));
  }
  constructor(private filamentService: FilamentService) {}
}
