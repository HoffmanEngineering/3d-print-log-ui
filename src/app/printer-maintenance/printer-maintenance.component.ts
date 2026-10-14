import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce } from 'lodash';
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
import { toSortHeaderIds } from '../core/utils/sort-header-ids';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultFlexDirective,
  DefaultLayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatFormField,
  MatLabel,
  MatSuffix,
  MatError,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSelect, MatOption } from '@angular/material/select';
import { PrinterAvatarComponent } from '../shared/printer-avatar/printer-avatar.component';
import { DefaultStyleDirective } from '@ngbracket/ngx-layout/extended';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatDatepickerInput,
  MatDatepickerToggle,
  MatDatepicker,
} from '@angular/material/datepicker';
import {
  MatAutocompleteTrigger,
  MatAutocomplete,
} from '@angular/material/autocomplete';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { AdComponent } from '../shared/ad/ad.component';
import { LocaleDatePipe } from '../shared/pipes/locale-date.pipe';

@Component({
  selector: 'app-printer-maintenance',
  templateUrl: './printer-maintenance.component.html',
  styleUrls: ['./printer-maintenance.component.scss'],
  imports: [
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    DefaultFlexDirective,
    DefaultLayoutGapDirective,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatSelect,
    MatOption,
    PrinterAvatarComponent,
    DefaultStyleDirective,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatCheckbox,
    MatSortHeader,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatSuffix,
    MatDatepicker,
    MatError,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator,
    AdComponent,
    LocaleDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterMaintenanceComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private titleService = inject(Title);
  private router = inject(Router);
  private printerMaintenanceService = inject(PrinterMaintenanceService);
  private readonly toastrService = inject(ToastrService);
  dialog = inject(MatDialog);

  readonly editId = signal<string | null>(null);

  readonly entries = signal<PrinterMaintenanceDto[]>([]);
  readonly printers = signal<PrinterSummary[]>([]);
  public categories: string[] = [];
  readonly pageSize = signal<number | undefined>(undefined);
  readonly currentPage = signal<number | undefined>(undefined);
  readonly totalCount = signal<number | undefined>(undefined);

  private subscriptions: Subscription = new Subscription();

  readonly preferredCurrencySymbolSetting = signal<UserSetting | null>(null);

  readonly searchText = signal('');

  readonly filterByPrinterIds = signal<number[]>([]);

  public printerMaintenanceSortColumn = toSortHeaderIds(
    PrinterMaintenanceSortColumn
  );

  public debouncedUpdateFilter;

  public includeDone: boolean = true;
  public includeNotDone: boolean = true;

  public sortColumn = PrinterMaintenanceSortColumn.Date;
  public sortDirection = SortDirection.Desc;

  public isLoading = false;

  public printSearchSubscription: Subscription | null = null;

  readonly filteredCategories = signal<string[]>([]);

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

  readonly dateError = signal<string | null>(null);
  readonly printerError = signal<string | null>(null);

  public emptyGuid = EMPTY_GUID;

  constructor() {
    this.debouncedUpdateFilter = debounce(() => {
      this.isLoading = true;
      this.currentPage.set(1);
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
        this.searchText.set(params.get('searchText'));
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
        this.filterByPrinterIds.set(
          params.getAll('filterByPrinterId').map((id) => +id)
        );
      } else {
        this.filterByPrinterIds.set([]);
      }
    });

    this.getCategories();

    // Get the data from the resolver
    this.activatedRoute.data.subscribe((data) => {
      this.preferredCurrencySymbolSetting.set(
        data.preferredCurrencySymbolSetting
      );

      const pagedResponse: PagedList<PrinterMaintenanceDto> = data.entries;
      this.handlePagedList(pagedResponse);

      this.printers.set(data.printers);
    });
  }

  private getCategories() {
    this.printerMaintenanceService
      .getPrinterMaintenanceCategories()
      .subscribe((dto) => {
        this.categories = dto.categories;
        this.filteredCategories.set(dto.categories);
      });
  }

  private handlePagedList(response: PagedList<PrinterMaintenanceDto>) {
    this.entries.set(response.items);

    this.currentPage.set(response.paging.currentPage);
    this.pageSize.set(response.paging.pageSize);
    this.totalCount.set(response.paging.totalCount);
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage.set(pageEvent.pageIndex + 1);
    this.pageSize.set(pageEvent.pageSize);

    this.updateFilter();
  }

  public sortData(sort: Sort) {
    this.sortColumn = +sort.active;

    this.sortDirection =
      sort.direction === 'asc' ? SortDirection.Asc : SortDirection.Desc;

    this.currentPage.set(1);

    this.updateFilter();
  }

  public resetFilters() {
    this.currentPage.set(1);
    this.searchText.set('');
    this.includeDone = true;
    this.includeNotDone = true;
    this.filterByPrinterIds.set([]);

    this.sortDirection = SortDirection.Desc;
    this.sortColumn = PrinterMaintenanceSortColumn.Date;

    this.updateFilter();
  }

  public updateFilter(callback?: () => void) {
    this.isLoading = true;

    localStorage.setItem(
      'printer_maintenance_list_page_size',
      this.pageSize().toString(10)
    );

    return this.router
      .navigate(['.'], {
        queryParams: {
          pageNumber: this.currentPage(),
          pageSize: this.pageSize(),
          searchText: this.searchText() || '',
          filterByPrinterId: this.filterByPrinterIds(),
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
            this.currentPage(),
            this.pageSize(),
            this.searchText() || '',
            this.filterByPrinterIds(),
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

    const symbol = this.preferredCurrencySymbolSetting()?.value ?? '$';

    return `${symbol}${entry.priceValue}`;
  }

  addEntry() {
    if (this.entries().some((e) => e.id === EMPTY_GUID)) {
      return;
    }

    this.printerError.set(null);
    this.dateError.set(null);

    this.entries.set([
      {
        id: EMPTY_GUID,
        date: (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })().toISOString(),
        done: false,
        printerId: null,
        printer: null,
        category: '',
        description: '',
        priceValue: null,
        notes: '',
      },
      ...this.entries(),
    ]);

    this.editId.set(EMPTY_GUID);
  }

  editEntry(entry: PrinterMaintenanceDto) {
    this.printerError.set(null);
    this.dateError.set(null);

    this.editId.set(entry.id);
    this.preEditEntry = { ...entry };
  }

  deleteEntry(entry: PrinterMaintenanceDto) {}

  saveEntry(entry: PrinterMaintenanceDto) {
    this.isLoading = true;

    // Validate the date and printerId, if they are invalid, don't save
    if (entry.date == null) {
      this.isLoading = false;
      this.dateError.set('Date is required');
    } else {
      this.dateError.set(null);
    }

    if (entry.printerId == null) {
      this.isLoading = false;
      this.printerError.set('Printer is required');
    } else {
      this.printerError.set(null);
    }

    if (this.dateError() || this.printerError()) {
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
          this.entries.update((entries) => [
            result,
            ...entries.filter((e) => e.id !== EMPTY_GUID),
          ]);

          this.editId.set(null);

          checkCategory();

          const callback = () => {
            this.isLoading = false;
            // if the new entry is not on the current page, display a toast to let the user know
            if (this.entries().findIndex((e) => e.id === result.id) === -1) {
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
          this.entries.update((entries) =>
            entries
              .filter((e) => e.id !== EMPTY_GUID)
              .map((e) => (e.id === result.id ? result : e))
          );

          checkCategory();

          this.isLoading = false;

          this.editId.set(null);
        });
    }
  }

  cancelEdit() {
    const editId = this.editId();
    if (editId === EMPTY_GUID) {
      this.entries.update((entries) =>
        entries.filter((e) => e.id !== EMPTY_GUID)
      );
    } else {
      this.entries.update((entries) =>
        entries.map((e) => (e.id === editId ? this.preEditEntry : e))
      );
    }

    this.printerError.set(null);
    this.dateError.set(null);

    this.editId.set(null);
  }

  updateDate(entry: PrinterMaintenanceDto, date: any) {
    entry.date = date.value.toISOString();
  }

  updatePrinter(entry: PrinterMaintenanceDto, printerId: number) {
    const printer = this.printers().find((p) => p.id === printerId);

    entry.printerId = printer.id;
    entry.printer = printer;
  }

  public filterCategories(value: string) {
    this.filteredCategories.set(this._filterCategories(value));
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
            this.editId.set(null);

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
