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
import { PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs/operators';
import {
  GroupedFeedItemDto,
  ProjectService,
} from 'src/app/core/services/project.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';

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
  imports: [SharedModule, ProjectChipComponent, RouterLink],
})
export class PrintGroupedViewComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);
  private readonly destroyRef = inject(DestroyRef);

  // ---- Inputs from PrintListComponent ----
  searchText = input<string>('');
  filterByStatus = input<PrintStatus | null>(null);
  filterByPrinterIds = input<number[]>([]);
  filterByFilamentIds = input<string[]>([]);
  sortColumn = input<PrintSummarySortColumn>(PrintSummarySortColumn.StartDate);
  sortDirection = input<SortDirection>(SortDirection.Desc);
  displayedColumns = input<string[]>([]);

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

  getPrinterLabel(printer: PrinterSummary): string {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(printer.make + ' ' + printer.model).trim()})`;
    }
    return `${(printer.make + ' ' + printer.model).trim()}`;
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
