import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { debounce, isNumber } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { MaterialCategory } from 'src/app/core/services/material-categories.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  QrLabelDialogComponent,
  QrLabelDialogData,
} from 'src/app/shared/qr-label-dialog/qr-label-dialog.component';
import { toSortHeaderIds } from '../../core/utils/sort-header-ids';

@Component({
  selector: 'app-filament-list-container',
  templateUrl: './filament-list-container.component.html',
  styleUrls: ['./filament-list-container.component.scss'],
  standalone: false,
})
export class FilamentListContainerComponent implements OnInit, OnDestroy {
  public filaments: FilamentSummary[] = [];

  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public displayedColumns: string[] = [
    'select',
    'isFavorite',
    'image',
    'colorHex',
    'displayName',
    'brand',
    'colorName',
    'materialType',
    'storageLocation',
    'loadedInPrinter',
    'filamentRemaining',
    'isActive',
    'more',
  ];

  public selectedFilaments = new Map<string, FilamentSummary>();

  public debouncedUpdateFilter;

  readonly ColorPatternType = ColorPatternType;
  readonly FilamentFinishType = FilamentFinishType;
  readonly FilamentEffect = FilamentEffect;

  public filamentSortColumns = toSortHeaderIds(FilamentSortColumns);
  public sortColumn = FilamentSortColumns.FilamentRemaining;
  /**
   * `matSortActive` compares against the header's string id, so the numeric
   * enum has to be stringified or the initial sort arrow never renders.
   */
  public get sortColumnId(): string {
    return String(this.sortColumn);
  }
  public sortDirection = SortDirection.Desc;

  public includeInactive = false;
  public searchText = '';
  public showFavoritesOnly = false;
  public showLoadedFilamentOnly = false;

  private EMPTY_FILAMENT_ADJUSTMENT_NOTE: string = 'Set to Empty.';

  private subscriptions: Subscription = new Subscription();

  public isLoading = false;

  public filamentSearchSubscription: Subscription | null = null;

  public materialCategories: MaterialCategory[] = [];

  public filterByMaterialCategory: string = '';
  public storageLocations: string[] = [];
  public filterByStorageLocation: string = '';
  public filterByColorPatterns: ColorPatternType[] = [];
  public filterByFinishTypes: FilamentFinishType[] = [];
  public filterByEffects: FilamentEffect[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private filamentService: FilamentService,
    private titleService: Title,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly toastrService: ToastrService
  ) {
    // Mark the list as loading on the keystroke itself, not when the debounce
    // finally fires, so the empty state cannot flash stale copy for 400ms.
    const debouncedFilterUpdate = debounce(() => {
      this.currentPage = 1;
      this.updateFilter();
    }, 400);

    this.debouncedUpdateFilter = () => {
      this.isLoading = true;
      debouncedFilterUpdate();
    };

    this.subscriptions.add(
      router.events
        .pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1)
        )
        .subscribe(() => {
          const mainHeader = document.querySelector(
            '#add-new-filament'
          ) as HTMLElement;
          if (mainHeader) {
            mainHeader?.focus?.();
          }
        })
    );
  }

  ngOnInit() {
    this.titleService.setTitle('My Filament - 3D Print Log');

    this.activatedRoute.queryParamMap.subscribe((params) => {
      if (params.has('searchText')) {
        this.searchText = params.get('searchText');
      }

      if (params.has('filterByMaterialCategory')) {
        this.filterByMaterialCategory = params.get('filterByMaterialCategory');
      }

      if (params.has('filterByStorageLocation')) {
        this.filterByStorageLocation =
          params.get('filterByStorageLocation') ?? '';
      }

      if (params.has('includeInactive')) {
        this.includeInactive =
          params.get('includeInactive').toLowerCase() === 'true';
      }
      if (params.has('showFavoritesOnly')) {
        this.showFavoritesOnly =
          params.get('showFavoritesOnly').toLowerCase() === 'true';
      }
      if (params.has('showLoadedFilamentOnly')) {
        this.showLoadedFilamentOnly =
          params.get('showLoadedFilamentOnly').toLowerCase() === 'true';
      }

      if (params.has('sortDirection')) {
        this.sortDirection = +params.get('sortDirection');
      }
      if (params.has('sortColumn')) {
        this.sortColumn = +params.get('sortColumn');
      }

      if (params.has('pageNumber')) {
        this.currentPage = +params.get('pageNumber');
      }
      if (params.has('pageSize')) {
        this.pageSize = +params.get('pageSize');
      }

      this.filterByColorPatterns = params
        .getAll('colorPatterns')
        .map((v) => +v as ColorPatternType);
      this.filterByFinishTypes = params
        .getAll('finishTypes')
        .map((v) => +v as FilamentFinishType);
      this.filterByEffects = params
        .getAll('effects')
        .map((v) => +v as FilamentEffect);
    });

    this.activatedRoute.data.subscribe((data) => {
      this.materialCategories = data.materialCategories;
      this.storageLocations = data.storageLocations ?? [];

      const pagedResponse: PagedList<FilamentSummary> = data.filamentList;
      this.handlePagedList(pagedResponse);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();

    this.filamentSearchSubscription?.unsubscribe?.();
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage = pageEvent.pageIndex + 1;
    this.pageSize = pageEvent.pageSize;

    this.updateFilter();
  }

  public updateFilter() {
    this.isLoading = true;

    localStorage.setItem('filament_list_page_size', this.pageSize.toString(10));

    return this.router
      .navigate(['.'], {
        queryParams: {
          pageNumber: this.currentPage,
          pageSize: this.pageSize,
          searchText: this.searchText || '',
          includeInactive: this.includeInactive,
          showFavoritesOnly: this.showFavoritesOnly,
          showLoadedFilamentOnly: this.showLoadedFilamentOnly,
          filterByMaterialCategory: this.filterByMaterialCategory || '',
          filterByStorageLocation: this.filterByStorageLocation || '',
          colorPatterns: this.filterByColorPatterns.length
            ? this.filterByColorPatterns
            : null,
          finishTypes: this.filterByFinishTypes.length
            ? this.filterByFinishTypes
            : null,
          effects: this.filterByEffects.length ? this.filterByEffects : null,
          sortDirection: this.sortDirection,
          sortColumn: this.sortColumn,
          t: new Date().getTime(),
        },
        relativeTo: this.activatedRoute,
      })
      .then(() => {
        this.filamentSearchSubscription?.unsubscribe?.();

        this.filamentSearchSubscription = this.filamentService
          .getCurrentUserFilamentSummaries(
            this.currentPage,
            this.pageSize,
            this.sortColumn,
            this.sortDirection,
            this.searchText,
            this.includeInactive,
            this.showFavoritesOnly,
            this.showLoadedFilamentOnly,
            this.filterByMaterialCategory,
            this.filterByStorageLocation,
            this.filterByColorPatterns.length
              ? this.filterByColorPatterns
              : undefined,
            this.filterByFinishTypes.length
              ? this.filterByFinishTypes
              : undefined,
            this.filterByEffects.length ? this.filterByEffects : undefined
          )
          .subscribe(
            (filaments) => {
              this.handlePagedList(filaments);
              this.isLoading = false;
            },
            () => {
              this.isLoading = false;
            }
          );
      });
  }

  public deleteFilament(filament: FilamentSummary) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    (dialogRef.componentInstance as any).title = 'Delete?';
    // eslint-disable-next-line max-len
    (dialogRef.componentInstance as any).body =
      `Are you sure you want to delete material "${filament.displayName}"? <br /> <br />  This action cannot be undone.`;
    (dialogRef.componentInstance as any).yesText = 'Delete';
    (dialogRef.componentInstance as any).yesColor = 'warn';
    (dialogRef.componentInstance as any).noText = 'Cancel';

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.filamentService.deleteFilament(filament.id).subscribe(
          (_) => {
            // Remove from selection if selected
            if (this.selectedFilaments.has(filament.id)) {
              this.selectedFilaments.delete(filament.id);
              this.selectedFilaments = new Map(this.selectedFilaments);
            }
            this.updateFilter().then(() => {
              this.toastrService.success(
                'Material removed successfully.',
                'Success'
              );
            });
          },
          (err) => {
            // Handle Error Messages:

            if (err.status === 400) {
              this.toastrService.error(err.error, 'Cannot Delete Material', {
                progressBar: true,
                timeOut: 10000,
                extendedTimeOut: 5000,
              });
            } else {
              this.toastrService.error(
                'An error occurred, please wait a few seconds and try again.',
                'Error Occurred',
                {
                  progressBar: true,
                  timeOut: 5000,
                }
              );
            }
          }
        );
      }
    });
  }

  public sortData(sort: Sort) {
    this.sortColumn = +sort.active;

    this.sortDirection =
      sort.direction === 'asc' ? SortDirection.Asc : SortDirection.Desc;

    this.currentPage = 1;

    this.updateFilter();
  }

  private handlePagedList(response: PagedList<FilamentSummary>) {
    this.filaments = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }

  public getPrinterLabel(filament: FilamentSummary) {
    const printer = filament?.loadedInPrinter;

    if (printer === null || printer === undefined) {
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

  /**
   * Mark a filament as empty.
   */
  public markAsEmpty(filament: FilamentSummary) {
    const remainingAmount = filament.filamentRemaining;
    if (isNumber(remainingAmount)) {
      const adjustmentAmount = -remainingAmount;
      this.filamentService
        .addAdjustmentAmount(
          filament.id,
          adjustmentAmount,
          this.EMPTY_FILAMENT_ADJUSTMENT_NOTE,
          false
        )
        .subscribe((_) => {
          this.updateFilter().then(() => {
            this.toastrService.success(
              'Material marked as empty successfully.',
              'Success'
            );
          });
        });
    }
  }

  public toggleFavorite(filament: FilamentSummary) {
    const newIsFavorite = !filament.isFavorite;
    this.filamentService
      .changeFavorite(filament.id, newIsFavorite)
      .subscribe((_) => {
        filament.isFavorite = newIsFavorite;
      });
  }

  public printQrLabel(filament: FilamentSummary) {
    this.dialog.open(QrLabelDialogComponent, {
      data: { filaments: [filament] } as QrLabelDialogData,
      width: '600px',
    });
  }

  public printAllLabels() {
    const filamentsToPrint = this.hasSelection()
      ? Array.from(this.selectedFilaments.values())
      : this.filaments;

    if (filamentsToPrint.length === 0) {
      return;
    }
    this.dialog.open(QrLabelDialogComponent, {
      data: { filaments: filamentsToPrint } as QrLabelDialogData,
      width: '800px',
    });
  }

  // Selection methods
  public isSelected(filament: FilamentSummary): boolean {
    return this.selectedFilaments.has(filament.id);
  }

  public toggleSelection(filament: FilamentSummary): void {
    if (this.selectedFilaments.has(filament.id)) {
      this.selectedFilaments.delete(filament.id);
    } else {
      this.selectedFilaments.set(filament.id, filament);
    }
    // Reassign to trigger change detection
    this.selectedFilaments = new Map(this.selectedFilaments);
  }

  public toggleSelectAll(): void {
    if (this.isAllOnPageSelected()) {
      // Deselect all on current page
      this.filaments.forEach((f) => this.selectedFilaments.delete(f.id));
    } else {
      // Select all on current page
      this.filaments.forEach((f) => this.selectedFilaments.set(f.id, f));
    }
    // Reassign to trigger change detection
    this.selectedFilaments = new Map(this.selectedFilaments);
  }

  public isAllOnPageSelected(): boolean {
    return (
      this.filaments.length > 0 &&
      this.filaments.every((f) => this.selectedFilaments.has(f.id))
    );
  }

  public isIndeterminate(): boolean {
    const selectedOnPage = this.filaments.filter((f) =>
      this.selectedFilaments.has(f.id)
    ).length;
    return selectedOnPage > 0 && selectedOnPage < this.filaments.length;
  }

  public hasSelection(): boolean {
    return this.selectedFilaments.size > 0;
  }

  public clearSelection(): void {
    this.selectedFilaments = new Map();
  }

  public getSelectionCount(): number {
    return this.selectedFilaments.size;
  }

  public isFilterPanelOpen = false;

  public toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  public get activeFilterCount(): number {
    let count = 0;
    if (this.showFavoritesOnly) count++;
    if (this.showLoadedFilamentOnly) count++;
    if (this.includeInactive) count++;
    if (this.filterByMaterialCategory) count++;
    if (this.filterByStorageLocation) count++;
    count += this.filterByColorPatterns.length;
    count += this.filterByFinishTypes.length;
    count += this.filterByEffects.length;
    return count;
  }

  public toggleColorPattern(pattern: ColorPatternType): void {
    const idx = this.filterByColorPatterns.indexOf(pattern);
    if (idx >= 0) this.filterByColorPatterns.splice(idx, 1);
    else this.filterByColorPatterns.push(pattern);
    this.currentPage = 1;
    this.updateFilter();
  }

  public toggleFinishType(finish: FilamentFinishType): void {
    const idx = this.filterByFinishTypes.indexOf(finish);
    if (idx >= 0) this.filterByFinishTypes.splice(idx, 1);
    else this.filterByFinishTypes.push(finish);
    this.currentPage = 1;
    this.updateFilter();
  }

  public toggleEffect(effect: FilamentEffect): void {
    const idx = this.filterByEffects.indexOf(effect);
    if (idx >= 0) this.filterByEffects.splice(idx, 1);
    else this.filterByEffects.push(effect);
    this.currentPage = 1;
    this.updateFilter();
  }

  /** Explains which filters and search term are hiding every material. */
  public get emptyStateFilteredMessage(): string {
    const parts: string[] = [];
    const count = this.activeFilterCount;

    if (count > 0) {
      parts.push(`${count} active filter${count === 1 ? '' : 's'}`);
    }

    if (this.searchText.trim().length > 0) {
      parts.push(`a search for "${this.searchText.trim()}"`);
    }

    return `Nothing matched ${parts.join(' and ')}. Clear them to see your whole material list.`;
  }

  public resetFilters(): void {
    this.searchText = '';
    this.showFavoritesOnly = false;
    this.showLoadedFilamentOnly = false;
    this.includeInactive = false;
    this.filterByMaterialCategory = '';
    this.filterByStorageLocation = '';
    this.filterByColorPatterns = [];
    this.filterByFinishTypes = [];
    this.filterByEffects = [];
    this.currentPage = 1;
    this.updateFilter();
  }

  public navigateToFilament(id: string): void {
    this.router.navigate([id], { relativeTo: this.activatedRoute });
  }
}
