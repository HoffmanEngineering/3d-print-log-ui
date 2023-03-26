import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import {
  PrinterMaintenanceDto,
  PrinterMaintenanceService,
  PrinterMaintenanceSortColumn,
} from 'src/app/core/services/printer-maintenance.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';

@Injectable()
export class PrinterMaintenanceResolverService
  implements Resolve<PagedList<PrinterMaintenanceDto>>
{
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
      includeDone = true,
      includeNotDone = true,
      sortDirection = SortDirection.Desc,
      sortColumn = PrinterMaintenanceSortColumn.Date,
    } = route.queryParams;

    const printerIds = route.queryParamMap
      .getAll('filterByPrinterId')
      .map((id) => +id);

    return this.printerMaintenanceService.getCurrentUserPrinterMaintenance(
      pageNumber,
      pageSize,
      searchText,
      printerIds,
      includeDone,
      includeNotDone,
      sortDirection,
      sortColumn
    );
  }
  constructor(private printerMaintenanceService: PrinterMaintenanceService) {}
}
