import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce } from 'lodash';
import moment from 'moment';
import { ToastrService } from 'ngx-toastr';
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
import { SimpleDialogComponent } from '../shared/simple-dialog/simple-dialog.component';

@Component({
  selector: 'app-printer-maintenance',
  templateUrl: './printer-maintenance.component.html',
  styleUrls: ['./printer-maintenance.component.scss'],
  standalone: false,
})
export class PrinterMaintenanceComponent implements OnInit, OnDestroy {
  public editId: string | null = null;

  public entries: PrinterMaintenanceDto[] = [];
  public printers: PrinterSummary[] = [];
  public categories: string[] = [];
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

  public filteredCategories: string[] = [];

  public displayedColumns: string[] = [
    'done',
    'date',
    'printer',
    'category',
    'description',
    'price',
    'notes',
    'more',
  ];

  public preEditEntry: PrinterMaintenanceDto | null = null;

  public dateError: string | null = null;
  public printerError: string | null = null;

  public emptyGuid = EMPTY_GUID;

  constructor(
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private router: Router,
    private printerMaintenanceService: PrinterMaintenanceService,
    private readonly toastrService: ToastrService,
    public dialog: MatDialog
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

    this.getCategories();

    // Get the data from the resolver
    this.activatedRoute.data.subscribe((data) => {
      this.preferredCurrencySymbolSetting = data.preferredCurrencySymbolSetting;

      const pagedResponse: PagedList<PrinterMaintenanceDto> = data.entries;
      this.handlePagedList(pagedResponse);

      this.printers = data.printers;
    });
  }

  private getCategories() {
    this.printerMaintenanceService
      .getPrinterMaintenanceCategories()
      .subscribe((dto) => {
        this.categories = dto.categories;
        this.filteredCategories = dto.categories;
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

  public updateFilter(callback?: () => void) {
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
              callback?.();
              this.isLoading = false;
            },
            () => {
              this.isLoading = false;
            }
          );
      });
  }

  public getPrinterLabel(printer: PrinterSummary) {
    if (printer == null) {
      return '';
    }

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

  toggleDone(entry: PrinterMaintenanceDto, checked: boolean) {
    entry.done = checked;

    // save entry
    this.printerMaintenanceService
      .updatePrinterMaintenanceEntry(entry)
      .subscribe(() => {
        // Is anything needed here?
      });
  }

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

    this.printerError = null;
    this.dateError = null;

    this.entries = [
      {
        id: EMPTY_GUID,
        date: moment().startOf('day').toDate().toISOString(),
        done: false,
        printerId: null,
        printer: null,
        category: '',
        description: '',
        priceValue: null,
        notes: '',
      },
      ...this.entries,
    ];

    this.editId = EMPTY_GUID;
  }

  editEntry(entry: PrinterMaintenanceDto) {
    this.printerError = null;
    this.dateError = null;

    this.editId = entry.id;
    this.preEditEntry = { ...entry };
  }

  deleteEntry(entry: PrinterMaintenanceDto) {}

  saveEntry(entry: PrinterMaintenanceDto) {
    this.isLoading = true;

    // Validate the date and printerId, if they are invalid, don't save
    if (entry.date == null) {
      this.isLoading = false;
      this.dateError = 'Date is required';
    } else {
      this.dateError = null;
    }

    if (entry.printerId == null) {
      this.isLoading = false;
      this.printerError = 'Printer is required';
    } else {
      this.printerError = null;
    }

    if (this.dateError || this.printerError) {
      console.log(this.dateError, this.printerError);
      return;
    }

    const checkCategory = () => {
      // If the entry category is not in the list of categories, add it
      if (
        !this.categories.some(
          (c) => c.toLowerCase() === entry.category.toLowerCase()
        )
      ) {
        this.getCategories();
      }
    };

    if (entry.id === EMPTY_GUID) {
      this.printerMaintenanceService
        .addPrinterMaintenanceEntry(entry)
        .subscribe((result) => {
          this.entries = this.entries.filter((e) => e.id !== EMPTY_GUID);

          this.entries = [result, ...this.entries];

          this.editId = null;

          checkCategory();

          const callback = () => {
            this.isLoading = false;
            // if the new entry is not on the current page, display a toast to let the user know
            if (this.entries.findIndex((e) => e.id === result.id) === -1) {
              this.toastrService.info(
                'The new entry was added to a different page. Use the pagination controls to view it.'
              );
            }
          };

          this.updateFilter(callback);
        });
    } else {
      this.printerMaintenanceService
        .updatePrinterMaintenanceEntry(entry)
        .subscribe((result) => {
          this.entries = this.entries.filter((e) => e.id !== EMPTY_GUID);

          this.entries = this.entries.map((e) => {
            if (e.id === result.id) {
              return result;
            }

            return e;
          });

          checkCategory();

          this.isLoading = false;

          this.editId = null;
        });
    }
  }

  cancelEdit() {
    if (this.editId === EMPTY_GUID) {
      this.entries = this.entries.filter((e) => e.id !== EMPTY_GUID);
    } else {
      const entryIndex = this.entries.findIndex((e) => e.id === this.editId);

      this.entries[entryIndex] = this.preEditEntry;

      this.entries = [...this.entries];
    }

    this.printerError = null;
    this.dateError = null;

    this.editId = null;
  }

  updateDate(entry: PrinterMaintenanceDto, date: any) {
    entry.date = date.value.toISOString();
  }

  updatePrinter(entry: PrinterMaintenanceDto, printerId: number) {
    const printer = this.printers.find((p) => p.id === printerId);

    entry.printerId = printer.id;
    entry.printer = printer;
  }

  public filterCategories(value: string) {
    this.filteredCategories = this._filterCategories(value);
  }

  private _filterCategories(value: string): string[] {
    if (value == null) {
      return this.categories.sort();
    }

    const filterValue = value.toLowerCase();

    if (value === '') {
      return this.categories.sort();
    }

    return this.categories
      .filter((option) => option.toLowerCase().includes(filterValue))
      .sort();
  }

  public tryDeleteEntry(entryId: string) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    (dialogRef.componentInstance as any).title = 'Delete?';
    // eslint-disable-next-line max-len
    (dialogRef.componentInstance as any).body =
      `Are you sure you want to delete maintenance entry? <br /> <br />  This action cannot be undone.`;
    (dialogRef.componentInstance as any).yesText = 'Delete';
    (dialogRef.componentInstance as any).yesColor = 'warn';
    (dialogRef.componentInstance as any).noText = 'Cancel';

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.printerMaintenanceService
          .deletePrinterMaintenanceEntry(entryId)
          .subscribe((_) => {
            this.editId = null;

            this.updateFilter().then(() => {
              this.toastrService.success(
                'Entry removed successfully.',
                'Success'
              );
            });
          });
      }
    });
  }
}
