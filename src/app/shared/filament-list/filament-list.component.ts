import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounce } from 'lodash-es';

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
  @Input()
  public showAddFilamentButton: false;

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
    'filamentRemaining',
  ];

  public debouncedUpdateFilter;

  public filamentSortColumns = FilamentSortColumns;
  public sortColumn = FilamentSortColumns.FilamentRemaining;
  public sortDirection = SortDirection.Desc;

  public includeInactive = false;
  public searchText = '';

  @Output()
  public filamentSelected = new EventEmitter<FilamentSummary>();

  constructor(private filamentService: FilamentService) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    this.updateFilter();
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
    this.filamentService
      .getCurrentUserFilamentSummaries(
        this.currentPage,
        this.pageSize,
        this.sortColumn,
        this.sortDirection,
        this.searchText,
        this.includeInactive
      )
      .subscribe((response) => {
        this.handlePagedList(response);
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
