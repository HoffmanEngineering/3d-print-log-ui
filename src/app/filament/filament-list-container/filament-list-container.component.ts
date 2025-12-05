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
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { MaterialCategory } from 'src/app/core/services/material-categories.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';

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
    'isFavorite',
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

  public debouncedUpdateFilter;

  public filamentSortColumns = FilamentSortColumns;
  public sortColumn = FilamentSortColumns.FilamentRemaining;
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

  constructor(
    private activatedRoute: ActivatedRoute,
    private filamentService: FilamentService,
    private titleService: Title,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly toastrService: ToastrService
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
    });

    this.activatedRoute.data.subscribe((data) => {
      this.materialCategories = data.materialCategories;

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
            this.filterByMaterialCategory
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
}
