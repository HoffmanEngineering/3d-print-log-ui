import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  PrintService,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';

@Injectable()
export class PrintListResolverService
  implements Resolve<PagedList<PrintSummary>>
{
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const {
      pageNumber = 1,
      pageSize = 10,
      searchText = '',
      filterByStatus = null,
      sortDirection = SortDirection.Desc,
      sortColumn = PrintSummarySortColumn.StartDate,
    } = route.queryParams;

    return this.printService.getPrintSummaries(
      pageNumber,
      pageSize,
      searchText,
      filterByStatus,
      sortDirection,
      sortColumn
    );
  }
  constructor(private printService: PrintService) {}
}
