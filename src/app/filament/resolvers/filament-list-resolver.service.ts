import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from '../../core/services/filament.service';

@Injectable()
export class FilamentListResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let defaultPageSize = 10;
    const savedPageSize = localStorage.getItem('filament_list_page_size');
    if (savedPageSize) {
      defaultPageSize = +savedPageSize;
    }

    const {
      pageNumber = 1,
      pageSize = defaultPageSize,
      searchText = '',
      includeInactive,
      showFavoritesOnly,
      showLoadedFilamentOnly,
      filterByMaterialCategory = '',
      filterByStorageLocation = '',
      sortDirection = SortDirection.Desc,
      sortColumn = FilamentSortColumns.FilamentRemaining,
    } = route.queryParams;

    return this.filamentService.getCurrentUserFilamentSummaries(
      pageNumber,
      pageSize,
      sortColumn,
      sortDirection,
      searchText,
      includeInactive,
      showFavoritesOnly,
      showLoadedFilamentOnly,
      filterByMaterialCategory,
      filterByStorageLocation
    );
  }
  constructor(private filamentService: FilamentService) {}
}
