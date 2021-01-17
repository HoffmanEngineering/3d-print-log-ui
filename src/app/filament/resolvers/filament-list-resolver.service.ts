import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from '../../core/services/filament.service';

@Injectable()
export class FilamentListResolverService
  implements Resolve<PagedList<FilamentSummary>> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const {
      pageNumber = 1,
      pageSize = 10,
      searchText = '',
      includeInactive,
      sortDirection = SortDirection.Desc,
      sortColumn = FilamentSortColumns.FilamentRemaining,
    } = route.queryParams;

    return this.filamentService.getCurrentUserFilamentSummaries(
      pageNumber,
      pageSize,
      sortColumn,
      sortDirection,
      searchText,
      includeInactive
    );
  }
  constructor(private filamentService: FilamentService) {}
}
