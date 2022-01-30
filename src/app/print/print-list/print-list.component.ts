import { MediaMatcher } from '@angular/cdk/layout';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
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
import { GcodeFileParserService } from 'src/app/core/services/gcode-file-parser.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';
import { PrintShareDialogComponent } from '../print-share-dialog/print-share-dialog.component';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';
import { PrintTableLayoutComponent } from './print-table-layout/print-table-layout.component';

export interface ColumnDefinition {
  key: string;
  displayName: string;
  description: string;
}

@Component({
  selector: 'app-print-list',
  templateUrl: './print-list.component.html',
  styleUrls: ['./print-list.component.scss'],
})
export class PrintListComponent implements OnInit, OnDestroy, AfterViewInit {
  public prints: PrintSummary[] = [];
  public printers: PrinterSummary[] = [];
  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public allPossibleColumns: ColumnDefinition[] = [
    {
      key: 'image',
      displayName: 'Image',
      description: 'The default image.',
    },
    {
      key: 'title',
      displayName: 'Title',
      description: "The print's title.",
    },
    {
      key: 'printer',
      displayName: 'Print',
      description: 'Make and model of the printer.',
    },
    {
      key: 'start-date',
      displayName: 'Start Date',
      description: '',
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
      key: 'status',
      displayName: 'Status',
      description: '',
    },
    {
      key: 'printTime',
      displayName: 'Print Time',
      description: 'Displays the actual print time, or estimated print time.',
    },
    {
      key: 'commentCount',
      displayName: 'Comments',
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
    'commentCount',
    'more',
  ];

  public searchText = '';

  public filterByStatus: PrintStatus | null = -1;

  public filterByPrinterIds: number[] = [];

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = PrintSummarySortColumn;

  public debouncedUpdateFilter;

  public sortColumn = PrintSummarySortColumn.StartDate;
  public sortDirection = SortDirection.Desc;

  public printerRedirectToast: ActiveToast<any> | null = null;
  public printerRedirectSubscription: Subscription;

  mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  public isLoading = false;

  public printSearchSubscription: Subscription | null = null;

  private subscriptions: Subscription = new Subscription();

  private readonly PRINT_TABLE_DISPLAYED_COLUMNS =
    'print_table_displayed_columns';

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerRedirectPromptService: PrinterRedirectPromptService,
    private toastrService: ToastrService,
    private titleService: Title,
    private router: Router,
    public dialog: MatDialog,
    private media: MediaMatcher,
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef,
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
        this.filterByStatus = +params.get('filterByStatus');
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

    this.activatedRoute.data.subscribe((data) => {
      const pagedResponse: PagedList<PrintSummary> = data.printList;
      this.handlePagedList(pagedResponse);

      this.printers = data.printers;
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
    console.log(columns);
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
          'commentCount',
          'more',
        ];
      }

      localStorage.setItem(
        this.PRINT_TABLE_DISPLAYED_COLUMNS,
        JSON.stringify(this.displayedColumns)
      );
    }

    // this.mobileQueryListener = () => {
    //   this.ngZone.run(() => {
    //     if (this.mobileQuery.matches) {
    //       this.displayedColumns = [
    //         'image',
    //         'title',
    //         'printer',
    //         'start-date',
    //         'status',
    //         'more',
    //       ];
    //     } else {
    //       this.displayedColumns = [
    //         'image',
    //         'title',
    //         'printer',
    //         'start-date',
    //         'status',
    //         'printTime',
    //         'commentCount',
    //         'more',
    //       ];
    //     }
    //     this.changeDetectorRef.detectChanges();
    //   });
    // };

    // this.mobileQuery.addListener(this.mobileQueryListener);
  }

  ngAfterViewInit() {
    this.mobileQueryListener();
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
    this.filterByStatus = -1;
    this.filterByPrinterIds = [];

    this.sortDirection = SortDirection.Desc;
    this.sortColumn = PrintSummarySortColumn.StartDate;

    this.updateFilter();
  }

  public updateFilter() {
    this.isLoading = true;

    return this.router
      .navigate(['.'], {
        queryParams: {
          pageNumber: this.currentPage,
          pageSize: this.pageSize,
          searchText: this.searchText || '',
          filterByStatus: this.filterByStatus,
          filterByPrinterId: this.filterByPrinterIds,
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
            this.filterByStatus,
            this.filterByPrinterIds,
            this.sortDirection,
            this.sortColumn
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

  public deletePrint(print: PrintSummary) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    (dialogRef.componentInstance as any).title = 'Delete?';
    // eslint-disable-next-line max-len
    (
      dialogRef.componentInstance as any
    ).body = `Are you sure you want to delete print "${print.title}"? <br /> <br />  This action cannot be undone.`;
    (dialogRef.componentInstance as any).yesText = 'Delete';
    (dialogRef.componentInstance as any).yesColor = 'warn';
    (dialogRef.componentInstance as any).noText = 'Cancel';

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
        allPossibleColumns: this.allPossibleColumns.filter(
          (column) => column.key !== 'more'
        ),
        currentColumns: this.displayedColumns,
        changeEvent: onSelectionChange,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      subscription.unsubscribe();
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
    } else {
      return 'Unknown';
    }
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
                  .catch((err) => console.error(err));
              }
            });
        };
        reader.readAsText(file);
      }
    }
  }
}
