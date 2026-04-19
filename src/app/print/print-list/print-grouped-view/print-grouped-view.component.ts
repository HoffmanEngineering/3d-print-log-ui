import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs/operators';
import moment from 'moment';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  GroupedFeedItemDto,
  ProjectService,
  ProjectStatus,
} from 'src/app/core/services/project.service';
import {
  PrintFilamentSummaryDto,
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from 'src/app/core/services/print.service';
import { UserSetting } from 'src/app/core/services/user-setting.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';
import { ProjectImageComponent } from 'src/app/shared/project-image/project-image.component';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { PrintShareDialogComponent } from 'src/app/print/print-share-dialog/print-share-dialog.component';
import { ColumnDefinition } from '../print-list.component';
import { PrintTableLayoutComponent } from '../print-table-layout/print-table-layout.component';

export type GroupedRow =
  | { kind: 'project'; item: GroupedFeedItemDto }
  | { kind: 'print'; item: GroupedFeedItemDto }
  | { kind: 'expanded-print'; print: PrintSummary; projectId: string }
  | { kind: 'more-prints'; projectId: string; count: number };

@Component({
  selector: 'app-print-grouped-view',
  templateUrl: './print-grouped-view.component.html',
  styleUrls: ['./print-grouped-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SharedModule,
    ProjectChipComponent,
    RouterLink,
    ProjectImageComponent,
  ],
})
export class PrintGroupedViewComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly toastrService = inject(ToastrService);
  private readonly loggingService = inject(LoggingService);

  readonly printStatusTypes = PrintStatus;

  private readonly mediaMatcher = inject(MediaMatcher);
  private readonly GROUPED_TABLE_DISPLAYED_COLUMNS =
    'grouped_table_displayed_columns';

  // ---- Inputs from PrintListComponent ----
  searchText = input<string>('');
  filterByStatus = input<PrintStatus | null>(null);
  filterByPrinterIds = input<number[]>([]);
  filterByFilamentIds = input<string[]>([]);
  sortColumn = input<PrintSummarySortColumn>(PrintSummarySortColumn.StartDate);
  sortDirection = input<SortDirection>(SortDirection.Desc);
  displayedColumns = signal<string[]>(this.loadDisplayedColumns());
  defaultFilamentPriceSetting = input<UserSetting | null>(null);
  preferredCurrencySymbolSetting = input<UserSetting | null>(null);

  // ---- Internal state ----
  feed = signal<PagedList<GroupedFeedItemDto> | null>(null);
  loading = signal(true);
  pageNumber = signal(1);
  readonly pageSize = 20;

  expandedProjectPrints = signal<Map<string, PrintSummary[]>>(new Map());

  flatRows = computed<GroupedRow[]>(() => {
    const items = this.feed()?.items ?? [];
    return this.buildFlatRows(items);
  });

  private feedSubscription: Subscription | null = null;

  // ---- Row-type predicates for matRowDef when ----
  isProjectRow = (_: number, row: GroupedRow) => row.kind === 'project';
  isPrintRow = (_: number, row: GroupedRow) => row.kind === 'print';
  isExpandedPrintRow = (_: number, row: GroupedRow) =>
    row.kind === 'expanded-print';
  isMorePrintsRow = (_: number, row: GroupedRow) => row.kind === 'more-prints';

  // Wire up filter change reactions in field initializers (injection context)
  private readonly _filterByStatusSub = toObservable(this.filterByStatus)
    .pipe(skip(1), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.onFilterChange());

  private readonly _filterByPrinterIdsSub = toObservable(
    this.filterByPrinterIds
  )
    .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.onFilterChange());

  private readonly _filterByFilamentIdsSub = toObservable(
    this.filterByFilamentIds
  )
    .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.onFilterChange());

  private readonly _sortColumnSub = toObservable(this.sortColumn)
    .pipe(skip(1), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.onFilterChange());

  private readonly _sortDirectionSub = toObservable(this.sortDirection)
    .pipe(skip(1), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.onFilterChange());

  private readonly _searchTextSub = toObservable(this.searchText)
    .pipe(
      skip(1),
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(() => this.onFilterChange());

  ngOnInit(): void {
    this.loadFeed();
  }

  private onFilterChange(): void {
    this.pageNumber.set(1);
    this.expandedProjectPrints.set(new Map());
    this.loadFeed();
  }

  loadFeed(): void {
    this.feedSubscription?.unsubscribe();
    this.loading.set(true);
    this.feedSubscription = this.projectService
      .getGroupedFeed(
        this.pageNumber(),
        this.pageSize,
        this.searchText(),
        this.filterByStatus(),
        this.filterByPrinterIds(),
        this.filterByFilamentIds(),
        this.sortColumn(),
        this.sortDirection()
      )
      .subscribe({
        next: (result) => {
          this.feed.set(result);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageNumber.set(event.pageIndex + 1);
    this.expandedProjectPrints.set(new Map());
    this.loadFeed();
  }

  onProjectToggle(projectId: string, _totalPrintCount: number): void {
    const map = new Map(this.expandedProjectPrints());
    if (map.has(projectId)) {
      map.delete(projectId);
      this.expandedProjectPrints.set(map);
      return;
    }

    // Fetch prints for this project with current filters applied
    this.printService
      .getPrintSummaries(
        1,
        100,
        this.searchText(),
        this.filterByStatus(),
        this.filterByPrinterIds(),
        this.filterByFilamentIds(),
        this.sortDirection(),
        this.sortColumn(),
        undefined,
        projectId
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const updated = new Map(this.expandedProjectPrints());
        updated.set(projectId, result.items);
        this.expandedProjectPrints.set(updated);
      });
  }

  getPrinterLabel(printer: PrinterSummary | null | undefined): string {
    if (!printer) return '';
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(printer.make + ' ' + printer.model).trim()})`;
    }
    return `${(printer.make + ' ' + printer.model).trim()}`;
  }

  getStatus(status: PrintStatus | undefined): string {
    switch (status) {
      case PrintStatus.Pending:
        return 'Pending';
      case PrintStatus.Printing:
        return 'Printing';
      case PrintStatus.Success:
        return 'Success';
      case PrintStatus.PartialSuccess:
        return 'Partial Success';
      case PrintStatus.Cancelled:
        return 'Cancelled';
      case PrintStatus.Failed:
        return 'Failed';
      default:
        return '';
    }
  }

  getStatusIcon(status: PrintStatus | undefined): string {
    switch (status) {
      case PrintStatus.Pending:
        return 'pending_actions';
      case PrintStatus.Printing:
        return 'play_circle_outline';
      case PrintStatus.Success:
        return 'check_circle_outline';
      case PrintStatus.PartialSuccess:
        return 'rule';
      case PrintStatus.Cancelled:
        return 'remove_circle_outline';
      case PrintStatus.Failed:
        return 'error_outline';
      default:
        return 'help_outline';
    }
  }

  getProjectStatusLabel(status: ProjectStatus | undefined): string {
    switch (status) {
      case ProjectStatus.InProgress:
        return 'In Progress';
      case ProjectStatus.Complete:
        return 'Complete';
      case ProjectStatus.OnHold:
        return 'On Hold';
      case ProjectStatus.Cancelled:
        return 'Cancelled';
      default:
        return '';
    }
  }

  getPrintEndDate(print: PrintSummary | undefined | null): Date | null {
    if (!print) return null;
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
      return moment(print.startDate).add(printTime, 'seconds').toDate();
    }
    return null;
  }

  getTotalFilamentCost(filamentUsage: PrintFilamentSummaryDto[]): string {
    const defaultPrice = this.defaultFilamentPriceSetting()?.value;
    const symbol = this.preferredCurrencySymbolSetting()?.value ?? '$';
    const total = this.printService.calculateTotalPrintCost(
      filamentUsage,
      symbol,
      defaultPrice
    );
    if (total.total.valid) {
      return total.total.formattedPrice;
    }
    return '';
  }

  trackByRow = (_index: number, row: GroupedRow): string => {
    switch (row.kind) {
      case 'project':
        return `project-${row.item.projectId}`;
      case 'print':
        return `print-${row.item.print?.id}`;
      case 'expanded-print':
        return `expanded-${row.projectId}-${row.print.id}`;
      case 'more-prints':
        return `more-${row.projectId}`;
    }
  };

  share(print: PrintSummary): void {
    this.loggingService.logEvent('PrintGroupedView_ShareClicked', {
      printId: print.id,
    });
    this.dialog.open(PrintShareDialogComponent, {
      width: '300px',
      minWidth: '300px',
      data: { printId: print.id },
    });
  }

  deletePrint(print: PrintSummary): void {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    dialogRef.componentInstance.title = 'Delete?';
    dialogRef.componentInstance.body = `Are you sure you want to delete print "${print.title}"? <br /><br /> This action cannot be undone.`;
    dialogRef.componentInstance.yesText = 'Delete';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.printService.deletePrint(print.id).subscribe(() => {
          this.toastrService.success('Print removed successfully.', 'Success');
          this.loadFeed();
        });
      }
    });
  }

  changeStatus(id: number, newStatus: PrintStatus): void {
    this.printService.updatePrintStatus(id, newStatus).subscribe(() => {
      this.toastrService.success('Status Updated.', 'Success');
      this.loadFeed();
    });
  }

  private loadDisplayedColumns(): string[] {
    try {
      const stored = JSON.parse(
        localStorage.getItem(this.GROUPED_TABLE_DISPLAYED_COLUMNS) ?? 'null'
      );
      if (Array.isArray(stored) && stored.every((e) => typeof e === 'string')) {
        return stored;
      }
    } catch {
      // Corrupted localStorage value — fall through to defaults
    }
    const defaults = this.mediaMatcher.matchMedia('(max-width: 800px)').matches
      ? ['title', 'status', 'more']
      : ['title', 'status', 'printTime', 'filamentSummary', 'more'];
    localStorage.setItem(
      this.GROUPED_TABLE_DISPLAYED_COLUMNS,
      JSON.stringify(defaults)
    );
    return defaults;
  }

  readonly allPossibleGroupedColumns: ColumnDefinition[] = [
    {
      key: 'image',
      displayName: 'Image (Small)',
      description:
        'Default project image (or folder icon if none) for project rows; small print thumbnail for print rows.',
    },
    {
      key: 'image-medium',
      displayName: 'Image (Medium)',
      description:
        'Default project image (or folder icon if none) for project rows; medium print thumbnail for print rows.',
    },
    {
      key: 'image-large',
      displayName: 'Image (Large)',
      description:
        'Default project image (or folder icon if none) for project rows; large print thumbnail for print rows.',
    },
    {
      key: 'title',
      displayName: 'Title',
      description:
        'Project name with expand/collapse for project rows; print title for print rows.',
    },
    {
      key: 'printer',
      displayName: 'Printer',
      description:
        'All printers used in the project for project rows; individual printer for print rows.',
    },
    {
      key: 'start-date',
      displayName: 'Start Date',
      description:
        'Most recent print date for project rows; individual start date for print rows.',
    },
    {
      key: 'start-time',
      displayName: 'Start Time',
      description: 'Start time for print rows.',
    },
    {
      key: 'start-date-time',
      displayName: 'Start Date/Time',
      description: 'Start date/time for print rows.',
    },
    {
      key: 'end-date',
      displayName: 'End Date',
      description: 'Computed end date for print rows.',
    },
    {
      key: 'end-time',
      displayName: 'End Time',
      description: 'Computed end time for print rows.',
    },
    {
      key: 'end-date-time',
      displayName: 'End Date/Time',
      description: 'Computed end date/time for print rows.',
    },
    {
      key: 'status',
      displayName: 'Status',
      description:
        'Project status for project rows; print status for print rows.',
    },
    {
      key: 'printTime',
      displayName: 'Print Time',
      description:
        'Total project print time for project rows; individual print time for print rows.',
    },
    {
      key: 'filamentSummary',
      displayName: 'Filament',
      description:
        'Aggregated filaments for project rows; per-print filaments for print rows.',
    },
    {
      key: 'totalFilamentUsage',
      displayName: 'Total Material (g)',
      description: 'Total filament weight in grams.',
    },
    {
      key: 'totalCost',
      displayName: 'Total Cost',
      description:
        'Aggregate filament cost for project rows; per-print cost for print rows.',
    },
    {
      key: 'commentCount',
      displayName: 'Comments',
      description: 'Comment count for print rows.',
    },
  ];

  openTableLayout(): void {
    const onSelectionChange = new Subject<string[]>();

    const subscription = onSelectionChange.subscribe((selectedColumns) => {
      this.displayedColumns.set([
        ...selectedColumns.filter((col) => col !== 'more'),
        'more',
      ]);
      localStorage.setItem(
        this.GROUPED_TABLE_DISPLAYED_COLUMNS,
        JSON.stringify(this.displayedColumns())
      );
    });

    const dialogRef = this.dialog.open(PrintTableLayoutComponent, {
      width: '450px',
      minWidth: '450px',
      disableClose: true,
      data: {
        title: 'Grouped View Table Layout',
        allPossibleColumns: this.allPossibleGroupedColumns,
        currentColumns: this.displayedColumns(),
        defaultColumns: [
          'title',
          'status',
          'printTime',
          'filamentSummary',
          'more',
        ],
        changeEvent: onSelectionChange,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      onSelectionChange.complete();
      subscription.unsubscribe();
      this.loggingService.logEvent('PrintGroupedViewLayoutChanged', {
        columns: JSON.stringify(this.displayedColumns()),
      });
    });
  }

  private buildFlatRows(items: GroupedFeedItemDto[]): GroupedRow[] {
    const rows: GroupedRow[] = [];
    for (const item of items) {
      if (item.type === 'project') {
        rows.push({ kind: 'project', item });
        const prints = this.expandedProjectPrints().get(item.projectId!);
        if (prints !== undefined) {
          for (const print of prints) {
            rows.push({
              kind: 'expanded-print',
              print,
              projectId: item.projectId!,
            });
          }
          const filteredCount = item.filteredPrintCount;
          const totalCount = item.printCount ?? 0;
          if (filteredCount !== null && filteredCount !== undefined) {
            const hiddenCount = totalCount - filteredCount;
            if (hiddenCount > 0) {
              rows.push({
                kind: 'more-prints',
                projectId: item.projectId!,
                count: hiddenCount,
              });
            }
          }
        }
      } else {
        rows.push({ kind: 'print', item });
      }
    }
    return rows;
  }
}
