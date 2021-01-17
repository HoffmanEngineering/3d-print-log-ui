import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce } from 'lodash';
import {
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';

@Component({
  selector: 'app-filament-list',
  templateUrl: './filament-list.component.html',
  styleUrls: ['./filament-list.component.scss'],
})
export class FilamentListComponent implements OnInit {
  public filaments: FilamentSummary[] = [];

  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public displayedColumns: string[] = [
    'colorHex',
    'displayName',
    'brand',
    'colorName',
    'filamentRemaining',
  ];

  public debouncedUpdateFilter;

  public filamentSortColumns = FilamentSortColumns;
  public sortColumn = FilamentSortColumns.FilamentRemaining;
  public sortDirection = SortDirection.Desc;

  public includeInactive = false;
  public searchText = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private filamentService: FilamentService,
    private titleService: Title,
    private readonly router: Router
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
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
    });

    this.activatedRoute.data.subscribe((data) => {
      const pagedResponse: PagedList<FilamentSummary> = data.filamentList;
      this.handlePagedList(pagedResponse);
    });
  }

  public pageChange(pageEvent: PageEvent) {
    const newPageNumber = pageEvent.pageIndex + 1;
    const newPageSize = pageEvent.pageSize;

    this.filamentService
      .getCurrentUserFilamentSummaries(newPageNumber, newPageSize)
      .subscribe((response) => {
        this.handlePagedList(response);
      });
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
}
