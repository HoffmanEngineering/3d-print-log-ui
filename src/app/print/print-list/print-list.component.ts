import { MediaMatcher } from '@angular/cdk/layout';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { debounce } from 'lodash-es';
import { ActiveToast, ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { GcodeFileParserService } from 'src/app/core/services/gcode-file-parser.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  FilamentPrice,
  FilamentPriceInvalid,
  FilamentPriceValid,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';
import { PrintShareDialogComponent } from '../print-share-dialog/print-share-dialog.component';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';
import { PrintTableLayoutComponent } from './print-table-layout/print-table-layout.component';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';

export interface ColumnDefinition {
  key: string;
  displayName: string;
  description: string;
}

@Component({
  selector: 'app-print-list',
  templateUrl: './print-list.component.html',
  styleUrls: ['./print-list.component.scss'],
  standalone: false,
})
export class PrintListComponent implements OnInit, OnDestroy {
  public prints: PrintSummary[] = [];
  public printers: PrinterSummary[] = [];
  public filaments: FilamentSummary[] = [];
  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public allPossibleColumns: ColumnDefinition[] = [
    {
      key: 'image',
      displayName: 'Image (Small)',
      description: 'The default image as a small thumbnail.',
    },
    {
      key: 'image-medium',
      displayName: 'Image (Medium)',
      description: 'The default image as a medium thumbnail.',
    },
    {
      key: 'image-large',
      displayName: 'Image (Large)',
      description: 'The default image as a large thumbnail.',
    },
    {
      key: 'title',
      displayName: 'Title',
      description: "The print's title.",
    },
    {
      key: 'printer',
      displayName: 'Printer',
      description: 'Make and model of the printer.',
    },
    {
      key: 'start-date',
      displayName: 'Start Date',
      description: 'Start date of the print',
    },
    {
      key: 'start-time',
      displayName: 'Start Time',
      description: 'Start time of the print',
    },
    {
      key: 'start-date-time',
      displayName: 'Start Date/Time',
      description: 'Start date/time of the print',
    },
    {
      key: 'end-date',
      displayName: 'End Date',
      description: 'End date of the print if there is a print time recorded.',
    },
    {
      key: 'end-time',
      displayName: 'End Time',
      description: 'End time of the print if there is a print time recorded.',
    },
    {
      key: 'end-date-time',
      displayName: 'End Date/Time',
      description:
        'End date/time of the print if there is a print time recorded.',
    },
    {
      key: 'status',
      displayName: 'Status',
      description: 'The print status.',
    },
    {
      key: 'printTime',
      displayName: 'Print Time',
      description: 'Displays the actual print time, or estimated print time.',
    },
    {
      key: 'filamentSummary',
      displayName: 'Material',
      description: 'Displays a summary of the material used.',
    },
    {
      key: 'totalFilamentUsage',
      displayName: 'Total Material (g)',
      description: 'Displays the total material usage in grams',
    },
    {
      key: 'totalCost',
      displayName: 'Total Cost',
      description: 'Displays the total print cost.',
    },
    {
      key: 'electricityCost',
      displayName: 'Electricity Cost',
      description:
        'Displays the electricity cost based on print time and printer wattage.',
    },
    {
      key: 'commentCount',
      displayName: 'Comment Count',
      description: 'Displays the number of comments',
    },
  ];

  public displayedColumns: string[] = [
    'image',
    'title',
    'printer',
    'start-date',
    'status',
    'printTime',
    'filamentSummary',
    'commentCount',
    'more',
  ];

  public searchText = '';

  private readonly VIEW_MODE_KEY = 'print_list_view_mode';

  private _viewMode: 'list' | 'grouped' =
    (localStorage.getItem('print_list_view_mode') as 'list' | 'grouped') ??
    'list';

  get viewMode(): 'list' | 'grouped' {
    return this._viewMode;
  }

  set viewMode(value: 'list' | 'grouped') {
    this._viewMode = value;
    localStorage.setItem(this.VIEW_MODE_KEY, value);
  }

  public filterByStatus = signal<PrintStatus | null>(null);

  public filterByPrinterIds = signal<number[]>([]);

  public filterByFilamentIds = signal<string[]>([]);
  public filterByFilaments = signal<FilamentSummary[]>([]);

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = PrintSummarySortColumn;

  public debouncedUpdateFilter;

  public sortColumn = PrintSummarySortColumn.StartDate;
  public sortDirection = SortDirection.Desc;

  public printerRedirectToast: ActiveToast<any> | null = null;
  public printerRedirectSubscription: Subscription;

  mobileQuery: MediaQueryList;

  public isLoading = false;

  public isFilterPanelOpen =
    typeof window !== 'undefined' && window.innerWidth >= 600;

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (
      this.filterByStatus() !== null &&
      (this.filterByStatus() as number) !== -1
    )
      count++;
    if (this.filterByPrinterIds().length > 0) count++;
    if (this.filterByFilamentIds().length > 0) count++;
    return count;
  });

  public toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  public printSearchSubscription: Subscription | null = null;

  private subscriptions: Subscription = new Subscription();

  private readonly PRINT_TABLE_DISPLAYED_COLUMNS =
    'print_table_displayed_columns';

  public preferredFilamentUnit = signal<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.AsRecorded
  );
  private readonly userSettingService = inject(UserSettingService);

  public defaultFilamentPriceSetting: UserSetting | null = null;

  public preferredCurrencySymbolSetting: UserSetting | null = null;

  public defaultElectricityKwhRateSetting: UserSetting | null = null;

  public defaultElectricityWattageSetting: UserSetting | null = null;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerRedirectPromptService: PrinterRedirectPromptService,
    private toastrService: ToastrService,
    private titleService: Title,
    private router: Router,
    public dialog: MatDialog,
    private media: MediaMatcher,
    private printService: PrintService,
    private readonly loggingService: LoggingService,
    private readonly gcodeParserService: GcodeFileParserService,
    private readonly newPrintStoreService: NewPrintStoreService
  ) {
    this.debouncedUpdateFilter = debounce(() => {
      this.isLoading = true;
      this.currentPage = 1;
      this.updateFilter();
    }, 400);

    this.subscriptions.add(
      router.events
        .pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1)
        )
        .subscribe(() => {
          const mainHeader = document.querySelector(
            '#add-new-print'
          ) as HTMLElement;
          if (mainHeader) {
            mainHeader?.focus?.();
          }
        })
    );
  }

  ngOnDestroy(): void {
    if (this.printerRedirectToast) {
      this.toastrService.remove(this.printerRedirectToast.toastId);
    }

    this.printerRedirectSubscription?.unsubscribe?.();

    this.subscriptions?.unsubscribe?.();
  }

  ngOnInit() {
    this.titleService.setTitle('My Prints - 3D Print Log');

    this.activatedRoute.queryParamMap.subscribe((params) => {
      if (params.has('searchText')) {
        this.searchText = params.get('searchText');
      }
      if (params.has('filterByStatus')) {
        this.filterByStatus.set(+params.get('filterByStatus'));
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

      if (params.has('filterByFilamentId')) {
        this.filterByFilamentIds.set(params.getAll('filterByFilamentId'));
      } else {
        this.filterByFilamentIds.set([]);
      }
    });

    this.activatedRoute.data.subscribe((data) => {
      this.defaultFilamentPriceSetting = data.defaultFilamentPriceSetting;
      this.preferredCurrencySymbolSetting = data.preferredCurrencySymbolSetting;
      this.defaultElectricityKwhRateSetting =
        data.defaultElectricityKwhRateSetting;
      this.defaultElectricityWattageSetting =
        data.defaultElectricityWattageSetting;

      const pagedResponse: PagedList<PrintSummary> = data.printList;
      this.handlePagedList(pagedResponse);

      this.printers = data.printers;
      this.filaments = data.filaments;

      this.filterByFilaments.set(
        this.filterByFilamentIds()
          .map((id) => this.filaments.find((f) => f.id === id))
          .filter((f) => f != null)
      );

      if (this.activeFilterCount() > 0) {
        this.isFilterPanelOpen = true;
      }
    });

    /**
     * Show the Add Printer prompt if needed.
     */
    this.printerRedirectPromptService
      .shouldShowAddPrinterPrompt()
      .subscribe((shouldShowPrompt) => {
        if (shouldShowPrompt) {
          this.printerRedirectToast = this.toastrService.info(
            'Click here to add a new 3D Printer before logging prints.',
            'No Active Printers',
            {
              disableTimeOut: true,
            }
          );

          this.printerRedirectSubscription =
            this.printerRedirectToast.onTap.subscribe(() => {
              this.loggingService.logEvent('NoActivePrinterPromptClicked');
              this.router.navigate(['printers', 'new']);
              this.printerRedirectSubscription?.unsubscribe?.();
            });
        }
      });

    this.mobileQuery = this.media.matchMedia('(max-width: 800px)');

    // Load display'd columns.
    const columns = JSON.parse(
      localStorage.getItem(this.PRINT_TABLE_DISPLAYED_COLUMNS)
    );

    // Error correction
    if (
      Array.isArray(columns) &&
      columns.every((entry) => typeof entry === 'string')
    ) {
      this.displayedColumns = columns;
    } else {
      // Initialize with defaults for size;
      if (this.mobileQuery.matches) {
        this.displayedColumns = [
          'image',
          'title',
          'printer',
          'start-date',
          'status',
          'more',
        ];
      } else {
        this.displayedColumns = [
          'image',
          'title',
          'printer',
          'start-date',
          'status',
          'printTime',
          'filamentSummary',
          'commentCount',
          'more',
        ];
      }

      localStorage.setItem(
        this.PRINT_TABLE_DISPLAYED_COLUMNS,
        JSON.stringify(this.displayedColumns)
      );
    }

    this.userSettingService
      .getCurrentUsersSettingByType(
        UserSettingType.Prints_PreferredFilamentDisplayUnit
      )
      .then((setting) => {
        if (setting) {
          this.preferredFilamentUnit.set(
            +setting.value as PrintFilamentSourceMeasurement
          );
        }
      });
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage = pageEvent.pageIndex + 1;
    this.pageSize = pageEvent.pageSize;

    this.updateFilter();
  }

  private handlePagedList(response: PagedList<PrintSummary>) {
    this.prints = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
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
    this.filterByStatus.set(null);
    this.filterByPrinterIds.set([]);
    this.filterByFilamentIds.set([]);
    this.filterByFilaments.set([]);

    this.sortDirection = SortDirection.Desc;
    this.sortColumn = PrintSummarySortColumn.StartDate;

    this.updateFilter();
  }

  public updateFilter() {
    this.isLoading = true;

    localStorage.setItem('print_list_page_size', this.pageSize.toString(10));

    return this.router
      .navigate(['.'], {
        queryParams: {
          pageNumber: this.currentPage,
          pageSize: this.pageSize,
          searchText: this.searchText || '',
          filterByStatus: this.filterByStatus(),
          filterByPrinterId: this.filterByPrinterIds(),
          filterByFilamentId: this.filterByFilamentIds(),
          sortDirection: this.sortDirection,
          sortColumn: this.sortColumn,
          t: new Date().getTime(),
        },
        relativeTo: this.activatedRoute,
      })
      .then(() => {
        this.printSearchSubscription?.unsubscribe?.();

        this.printSearchSubscription = this.printService
          .getPrintSummaries(
            this.currentPage,
            this.pageSize,
            this.searchText || '',
            this.filterByStatus(),
            this.filterByPrinterIds(),
            this.filterByFilamentIds(),
            this.sortDirection,
            this.sortColumn,
            undefined
          )
          .subscribe(
            (prints) => {
              this.handlePagedList(prints);
              this.isLoading = false;
            },
            () => {
              this.isLoading = false;
            }
          );
      });
  }

  public share(print: PrintSummary) {
    this.loggingService.logEvent('PrintListShareClicked', {
      printId: print.id,
    });
    const dialogRef = this.dialog.open(PrintShareDialogComponent, {
      width: '300px',
      minWidth: '300px',
      data: { printId: print.id },
    });

    dialogRef.afterClosed().subscribe((result) => {});
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

  public getFilamentLabel(filament: FilamentSummary) {
    return [
      filament.displayName,
      filament.brand,
      filament.materialType,
      filament.colorName,
    ]
      .filter(Boolean)
      .join(' - ');
  }

  public deletePrint(print: PrintSummary) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    dialogRef.componentInstance.title = 'Delete?';
    // eslint-disable-next-line max-len
    dialogRef.componentInstance.body = `Are you sure you want to delete print "${print.title}"? <br /> <br />  This action cannot be undone.`;
    dialogRef.componentInstance.yesText = 'Delete';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.printService.deletePrint(print.id).subscribe((_) => {
          this.updateFilter().then(() => {
            this.toastrService.success(
              'Print removed successfully.',
              'Success'
            );
          });
        });
      }
    });
  }

  public openPrintTableLayout() {
    const onSelectionChange = new Subject<string[]>();

    const subscription = onSelectionChange.subscribe((selectedColumns) => {
      // Always add the 'more' column at the end
      this.displayedColumns = [
        ...selectedColumns.filter((col) => col !== 'more'),
        'more',
      ];

      localStorage.setItem(
        this.PRINT_TABLE_DISPLAYED_COLUMNS,
        JSON.stringify(this.displayedColumns)
      );
    });

    const dialogRef = this.dialog.open(PrintTableLayoutComponent, {
      width: '450px',
      minWidth: '450px',
      disableClose: true,
      data: {
        title: 'All Prints Table Layout',
        allPossibleColumns: this.allPossibleColumns.filter(
          (column) => column.key !== 'more'
        ),
        currentColumns: this.displayedColumns,
        defaultColumns: [
          'image',
          'title',
          'printer',
          'start-date',
          'status',
          'printTime',
          'filamentSummary',
          'commentCount',
          'more',
        ],
        changeEvent: onSelectionChange,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      subscription.unsubscribe();

      this.loggingService.logEvent('PrintListLayoutChanged', {
        columns: JSON.stringify(this.displayedColumns),
      });
    });
  }

  /**
   * Changes the status of the selected print.
   * @param id The Print Id
   * @param newStatus The new status
   */
  public changeStatus(id: number, newStatus: PrintStatus) {
    this.printService.updatePrintStatus(id, newStatus).subscribe(() => {
      this.toastrService.success('Status Updated.', 'Success');
      const print = this.prints.find((p) => p.id === id);

      if (print) {
        print.status = newStatus;
      }
    });
  }

  public getStatus(print: PrintSummary) {
    if (print.status === PrintStatus.Cancelled) {
      return 'Cancelled';
    } else if (print.status === PrintStatus.Failed) {
      return 'Failed';
    } else if (print.status === PrintStatus.Pending) {
      return 'Pending';
    } else if (print.status === PrintStatus.Printing) {
      return 'Printing';
    } else if (print.status === PrintStatus.Success) {
      return 'Success';
    } else if (print.status === PrintStatus.PartialSuccess) {
      return 'Partial Success';
    } else {
      return 'Unknown';
    }
  }

  public getStatusIcon(print: PrintSummary): string {
    if (print.status === PrintStatus.Cancelled) {
      return 'remove_circle_outline';
    } else if (print.status === PrintStatus.Failed) {
      return 'error_outline';
    } else if (print.status === PrintStatus.Pending) {
      return 'pending_actions';
    } else if (print.status === PrintStatus.Printing) {
      return 'play_circle_outline';
    } else if (print.status === PrintStatus.Success) {
      return 'check_circle_outline';
    } else if (print.status === PrintStatus.PartialSuccess) {
      return 'rule';
    } else {
      return 'help_outline';
    }
  }

  public navigateToPrint(printId: number): void {
    this.router.navigate([printId], { relativeTo: this.activatedRoute });
  }

  public getPrintEndDate(print: PrintSummary) {
    if (
      print.startDate &&
      (print.estimatedPrintTimeInSeconds > 0 || print.printTimeInSeconds > 0)
    ) {
      const printTime =
        print.printTimeInSeconds > 0
          ? print.printTimeInSeconds
          : print.estimatedPrintTimeInSeconds > 0
            ? print.estimatedPrintTimeInSeconds
            : 0;

      return new Date(new Date(print.startDate).getTime() + printTime * 1000);
    }

    return null;
  }

  public getEstimatedPrice(filamentUsage: PrintFilamentSummaryDto) {
    const filament = filamentUsage.filament;

    const source = filamentUsage.estimatedSource;

    const weightG =
      filamentUsage.estimatedAmountMg > 0
        ? filamentUsage.estimatedAmountMg / 1000
        : undefined;

    const lengthM = filamentUsage.estimatedLengthInM;

    const volumeMl = filamentUsage.estimatedVolumeMl;

    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    return this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament,
        source,
        weightG,
        lengthM,
        volumeMl,
        currencySymbol: symbol,
        defaultFilamentPrice: defaultPrice,
      })
    );
  }

  public getActualPrice(filamentUsage: PrintFilamentSummaryDto) {
    const filament = filamentUsage.filament;

    const source = filamentUsage.source;
    const weightG =
      filamentUsage.amountMg > 0 ? filamentUsage.amountMg / 1000 : undefined;

    const lengthM = filamentUsage.lengthInM;

    const volumeMl = filamentUsage.volumeMl;

    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    return this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament,
        source,
        weightG,
        lengthM,
        volumeMl,
        currencySymbol: symbol,
        defaultFilamentPrice: defaultPrice,
      })
    );
  }

  public formatFilamentPrice(price: FilamentPrice) {
    if (price.valid) {
      let result = price.formattedPrice;
      if (price.usesDefaultPrice) {
        result += '*';
      }
      return result;
    } else {
      return (price as FilamentPriceInvalid).message;
    }
  }

  public getTotalFilamentCost(filamentUsage: PrintFilamentSummaryDto[]) {
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    const total = this.printService.calculateTotalPrintCost(
      filamentUsage,
      symbol,
      defaultPrice
    );

    if (total.total.valid) {
      return `${total.total.formattedPrice}`;
    }
    return '';
  }

  public getElectricityCost(print: PrintSummary): string {
    const result = this.printService.calculateElectricityCost({
      printTimeSeconds:
        print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: this.preferredCurrencySymbolSetting?.value ?? '$',
    });
    if (result.valid) {
      return result.formattedCost;
    }
    return '';
  }

  public getTotalCombinedCostTooltip(print: PrintSummary): string {
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';
    const materialTotal = this.printService.calculateTotalPrintCost(
      print.filamentUsage,
      symbol,
      defaultPrice
    );
    const electricityResult = this.printService.calculateElectricityCost({
      printTimeSeconds:
        print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: symbol,
    });
    const parts: string[] = [];
    if (materialTotal.total.valid) {
      parts.push(`Material: ${materialTotal.total.formattedPrice}`);
    }
    if (electricityResult.valid) {
      parts.push(`Electricity: ${electricityResult.formattedCost}`);
    }
    return parts.join('\n');
  }

  public getTotalCombinedCost(print: PrintSummary): string {
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';
    const materialTotal = this.printService.calculateTotalPrintCost(
      print.filamentUsage,
      symbol,
      defaultPrice
    );
    const electricityResult = this.printService.calculateElectricityCost({
      printTimeSeconds:
        print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: symbol,
    });
    if (materialTotal.total.valid && electricityResult.valid) {
      return (materialTotal.total as FilamentPriceValid).price
        .add(electricityResult.cost)
        .format({
          symbol,
          decimal: Intl.NumberFormat()
            .formatToParts(100000.1)
            .find((p) => p.type === 'decimal').value,
          separator: Intl.NumberFormat()
            .formatToParts(100000.1)
            .find((p) => p.type === 'group').value,
        });
    }
    if (materialTotal.total.valid) {
      return materialTotal.total.formattedPrice;
    }
    if (electricityResult.valid) {
      return electricityResult.formattedCost;
    }
    return '';
  }

  public parseGcode(event) {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        this.loggingService.logTrace(`Parsing gcode of filetype: ${file.type}`);
        // if (!file.type.match(/[gcode|g|txt|gco|gx]/)) {
        //   // this.toastr.error(
        //   //   'Please select an image.',
        //   //   'Selected file is not an Image'
        //   // );
        //   continue;
        // }

        const fileName = file.name;

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.gcodeParserService
            .parse(e.target.result, fileName)
            .then((newPrint) => {
              if (newPrint) {
                this.newPrintStoreService.setNewPrint(newPrint);
                this.router
                  .navigate(['new', 'edit'], {
                    relativeTo: this.activatedRoute,
                  })
                  .catch((err) => this.loggingService.logException(err));
              }
            });
        };
        reader.readAsText(file);
      }
    }
  }

  public searchFilament() {
    const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
      data: {
        otherFilamentOption: null,
        multiSelect: true,
      },
      height: '90svh',
      width: '95vw',
      maxWidth: '100vw',
      position: {
        top: '5vh',
      },
    });

    dialogRef.afterClosed().subscribe((filaments: FilamentSummary[] | null) => {
      if (filaments?.length) {
        for (const filament of filaments) {
          if (!this.filterByFilamentIds().includes(filament.id)) {
            this.filterByFilamentIds.update((ids) => [...ids, filament.id]);
            this.filterByFilaments.update((fs) => [...fs, filament]);
          }
        }
        this.currentPage = 1;
        this.updateFilter();
      }
    });
  }

  public removeFilamentFilter(filament: FilamentSummary) {
    this.filterByFilamentIds.update((ids) =>
      ids.filter((id) => id !== filament.id)
    );
    this.filterByFilaments.update((fs) =>
      fs.filter((f) => f.id !== filament.id)
    );
    this.currentPage = 1;
    this.updateFilter();
  }

  public navigateToNewProject(): void {
    this.router.navigate(['/projects', 'new']);
  }
}
