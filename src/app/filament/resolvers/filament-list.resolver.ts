import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from '../../core/services/filament.service';

/** The materials list page the URL's query describes. */
export const filamentListResolver: ResolveFn<PagedList<FilamentSummary>> = (
  route
) => {
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

  const colorPatterns = route.queryParamMap
    .getAll('colorPatterns')
    .map(Number) as ColorPatternType[];
  const finishTypes = route.queryParamMap
    .getAll('finishTypes')
    .map(Number) as FilamentFinishType[];
  const effects = route.queryParamMap
    .getAll('effects')
    .map(Number) as FilamentEffect[];

  return inject(FilamentService).getCurrentUserFilamentSummaries(
    pageNumber,
    pageSize,
    sortColumn,
    sortDirection,
    searchText,
    includeInactive,
    showFavoritesOnly,
    showLoadedFilamentOnly,
    filterByMaterialCategory,
    filterByStorageLocation,
    colorPatterns.length ? colorPatterns : undefined,
    finishTypes.length ? finishTypes : undefined,
    effects.length ? effects : undefined
  );
};
