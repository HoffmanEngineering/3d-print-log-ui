import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { debounce, isNumber } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';

@Component({
  selector: 'app-filament-list-container',
  templateUrl: './filament-list-container.component.html',
  styleUrls: ['./filament-list-container.component.scss'],
})
export class FilamentListContainerComponent implements OnInit, OnDestroy {
  public filaments: FilamentSummary[] = [];

  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public displayedColumns: string[] = [
    'colorHex',
    'displayName',
    'brand',
    'colorName',
    'materialType',
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

  private EMPTY_FILAMENT_ADJUSTMENT_NOTE: string = 'Set to Empty.';

  private subscriptions: Subscription = new Subscription();

  constructor(
    private activatedRoute: ActivatedRoute,
    private filamentService: FilamentService,
    private titleService: Title,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly toastrService: ToastrService
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);

    this.subscriptions.add(
      router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
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
      if (params.has('includeInactive')) {
        this.includeInactive =
          params.get('includeInactive').toLowerCase() === 'true';
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
      const pagedResponse: PagedList<FilamentSummary> = data.filamentList;
      this.handlePagedList(pagedResponse);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage = pageEvent.pageIndex + 1;
    this.pageSize = pageEvent.pageSize;

    this.updateFilter();
  }

  public updateFilter() {
    return this.router.navigate(['.'], {
      queryParams: {
        pageNumber: this.currentPage,
        pageSize: this.pageSize,
        searchText: this.searchText || '',
        includeInactive: this.includeInactive,
        sortDirection: this.sortDirection,
        sortColumn: this.sortColumn,
        t: new Date().getTime(),
      },
      relativeTo: this.activatedRoute,
    });
  }

  public deleteFilament(filament: FilamentSummary) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    (dialogRef.componentInstance as any).title = 'Delete?';
    // tslint:disable-next-line: max-line-length
    (
      dialogRef.componentInstance as any
    ).body = `Are you sure you want to delete filament "${filament.displayName}"? <br /> <br />  This action cannot be undone.`;
    (dialogRef.componentInstance as any).yesText = 'Delete';
    (dialogRef.componentInstance as any).yesColor = 'warn';
    (dialogRef.componentInstance as any).noText = 'Cancel';

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.filamentService.deleteFilament(filament.id).subscribe(
          (_) => {
            this.updateFilter().then(() => {
              this.toastrService.success(
                'Filament removed successfully.',
                'Success'
              );
            });
          },
          (err) => {
            // Handle Error Messages:

            if (err.status === 400) {
              this.toastrService.error(err.error, 'Cannot Delete Filament', {
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
              'Filament marked as empty successfully.',
              'Success'
            );
          });
        });
    }
  }
}
