import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  PrintService,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';

/** The prints list page the URL's query describes. */
export const printListResolver: ResolveFn<PagedList<PrintSummary>> = (
  route
) => {
  let defaultPageSize = 10;
  const savedPageSize = localStorage.getItem('print_list_page_size');
  if (savedPageSize) {
    defaultPageSize = +savedPageSize;
  }

  const {
    pageNumber = 1,
    pageSize = defaultPageSize,
    searchText = '',
    filterByStatus = null,
    sortDirection = SortDirection.Desc,
    sortColumn = PrintSummarySortColumn.StartDate,
    fromDate = null,
    toDate = null,
  } = route.queryParams;

  // Both ends or neither: a half-open range with one end open is not a range, and sending
  // one alone would filter in a way the user never asked for. The API 400s on a half-supplied
  // pair, so this also keeps a hand-edited URL from breaking the page.
  const dateRange = fromDate && toDate ? { fromDate, toDate } : undefined;

  const printerIds = route.queryParamMap
    .getAll('filterByPrinterId')
    .map((id) => +id);

  const filamentIds = route.queryParamMap.getAll('filterByFilamentId');

  return inject(PrintService).getPrintSummaries(
    pageNumber,
    pageSize,
    searchText,
    filterByStatus,
    printerIds,
    filamentIds,
    sortDirection,
    sortColumn,
    undefined,
    undefined,
    dateRange
  );
};
