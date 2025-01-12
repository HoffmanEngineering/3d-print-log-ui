import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  PrintService,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';

@Injectable()
export class PrintListResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
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
    } = route.queryParams;

    const printerIds = route.queryParamMap
      .getAll('filterByPrinterId')
      .map((id) => +id);

    const filamentIds = route.queryParamMap
      .getAll('filterByFilamentId')
      .map((id) => id);

    return this.printService.getPrintSummaries(
      pageNumber,
      pageSize,
      searchText,
      filterByStatus,
      printerIds,
      filamentIds,
      sortDirection,
      sortColumn
    );
  }
  constructor(private printService: PrintService) {}
}
