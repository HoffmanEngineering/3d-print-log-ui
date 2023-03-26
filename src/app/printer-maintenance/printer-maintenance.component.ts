import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce } from 'lodash';
import { Subscription } from 'rxjs';
import { EMPTY_GUID } from '../core/services/print.service';
import {
  PrinterMaintenanceDto,
  PrinterMaintenanceService,
  PrinterMaintenanceSortColumn,
} from '../core/services/printer-maintenance.service';
import { PrinterSummary } from '../core/services/printer.service';
import { UserSetting } from '../core/services/user-setting.service';
import { PagedList } from '../core/types/paging';
import { SortDirection } from '../core/types/sort-request';

@Component({
  selector: 'app-printer-maintenance',
  templateUrl: './printer-maintenance.component.html',
  styleUrls: ['./printer-maintenance.component.scss'],
})
export class PrinterMaintenanceComponent implements OnInit, OnDestroy {
  public editId: string | null = null;

  public entries: PrinterMaintenanceDto[] = [];
  public printers: PrinterSummary[] = [];
  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  private subscriptions: Subscription = new Subscription();

  public preferredCurrencySymbolSetting: UserSetting | null = null;

  public searchText = '';

  public filterByPrinterIds: number[] = [];

  public printerMaintenanceSortColumn = PrinterMaintenanceSortColumn;

  public debouncedUpdateFilter;

  public includeDone: boolean = true;
  public includeNotDone: boolean = true;

  public sortColumn = PrinterMaintenanceSortColumn.Date;
  public sortDirection = SortDirection.Desc;

  public isLoading = false;

  public printSearchSubscription: Subscription | null = null;

  public displayedColumns: string[] = [
    'done',
    'date',
    'printer',
    'category',
    'description',
    'price',
    'notes',
  ];

  constructor(
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private router: Router,
    private printerMaintenanceService: PrinterMaintenanceService
  ) {
    this.debouncedUpdateFilter = debounce(() => {
      this.isLoading = true;
      this.currentPage = 1;
      this.updateFilter();
    }, 400);
  }
  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();
  }

  ngOnInit(): void {
    this.titleService.setTitle('Maintenance - 3D Print Log');

    this.activatedRoute.queryParamMap.subscribe((params) => {
      if (params.has('searchText')) {
        this.searchText = params.get('searchText');
      }
      if (params.has('includeDone')) {
        this.includeDone = !!params.get('includeDone');
      }
      if (params.has('includeNotDone')) {
        this.includeNotDone = !!params.get('includeNotDone');
      }

      if (params.has('sortDirection')) {
        this.sortDirection = +params.get('sortDirection');
      }
      if (params.has('sortColumn')) {
        this.sortColumn = +params.get('sortColumn');
      }

      if (params.has('filterByPrinterId')) {
        this.filterByPrinterIds = params
          .getAll('filterByPrinterId')
          .map((id) => +id);
      } else {
        this.filterByPrinterIds = [];
      }
    });

    // Get the data from the resolver
    this.activatedRoute.data.subscribe((data) => {
      this.preferredCurrencySymbolSetting = data.preferredCurrencySymbolSetting;

      const pagedResponse: PagedList<PrinterMaintenanceDto> = data.entries;
      this.handlePagedList(pagedResponse);

      this.printers = data.printers;
    });
  }

  private handlePagedList(response: PagedList<PrinterMaintenanceDto>) {
    this.entries = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage = pageEvent.pageIndex + 1;
    this.pageSize = pageEvent.pageSize;

    this.updateFilter();
  }

  public sortData(sort: Sort) {
    this.sortColumn = +sort.active;

    this.sortDirection =
      sort.direction === 'asc' ? SortDirection.Asc : SortDirection.Desc;

    this.currentPage = 1;

    this.updateFilter();
  }

  public resetFilters() {
    this.currentPage = 1;
    this.searchText = '';
    this.includeDone = true;
    this.includeNotDone = true;
    this.filterByPrinterIds = [];

    this.sortDirection = SortDirection.Desc;
    this.sortColumn = PrinterMaintenanceSortColumn.Date;

    this.updateFilter();
  }

  public updateFilter() {
    this.isLoading = true;

    localStorage.setItem(
      'printer_maintenance_list_page_size',
      this.pageSize.toString(10)
    );

    return this.router
      .navigate(['.'], {
        queryParams: {
          pageNumber: this.currentPage,
          pageSize: this.pageSize,
          searchText: this.searchText || '',
          filterByPrinterId: this.filterByPrinterIds,
          includeDone: this.includeDone,
          includeNotDone: this.includeNotDone,
          sortDirection: this.sortDirection,
          sortColumn: this.sortColumn,
          t: new Date().getTime(),
        },
        relativeTo: this.activatedRoute,
      })
      .then(() => {
        this.printSearchSubscription?.unsubscribe?.();

        this.printSearchSubscription = this.printerMaintenanceService
          .getCurrentUserPrinterMaintenance(
            this.currentPage,
            this.pageSize,
            this.searchText || '',
            this.filterByPrinterIds,
            this.includeDone,
            this.includeNotDone,
            this.sortDirection,
            this.sortColumn
          )
          .subscribe(
            (entries) => {
              this.handlePagedList(entries);
              this.isLoading = false;
            },
            () => {
              this.isLoading = false;
            }
          );
      });
  }

  public getPrinterLabel(printer: PrinterSummary) {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(
        printer.make +
        ' ' +
        printer.model
      ).trim()})`;
    } else {
      return `${(printer.make + ' ' + printer.model).trim()}`;
    }
  }

  toggleDone(entry: PrinterMaintenanceDto) {}

  formatPrice(entry: PrinterMaintenanceDto) {
    if (entry.priceValue === null) {
      return '';
    }

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    return `${symbol}${entry.priceValue}`;
  }

  addEntry() {
    if (this.entries.some((e) => e.id === EMPTY_GUID)) {
      return;
    }

    this.entries = [
      {
        id: EMPTY_GUID,
        date: new Date().toISOString() as unknown as Date,
        done: false,
        printerId: null,
        category: '',
        description: '',
        priceValue: null,
        notes: '',
        priceCurrency: null,
      },
      ...this.entries,
    ];

    this.editId = EMPTY_GUID;
  }
}
