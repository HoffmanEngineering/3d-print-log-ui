import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounce } from 'lodash-es';

import {
  FilamentService,
  FilamentSortColumns,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import {
  MaterialCategory,
  MaterialCategoryService,
} from 'src/app/core/services/material-categories.service';
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
  ];

  public debouncedUpdateFilter;

  public filamentSortColumns = FilamentSortColumns;
  public sortColumn = FilamentSortColumns.FilamentRemaining;
  public sortDirection = SortDirection.Desc;

  public includeInactive = false;

  public showFavoritesOnly = false;
  public showLoadedFilamentOnly = false;
  public searchText = '';

  public materialCategories: MaterialCategory[] = [];

  @Input()
  get filterByMaterialCategory(): string {
    return this._filterByMaterialCategory;
  }
  set filterByMaterialCategory(filterByMaterialCategory: string) {
    this._filterByMaterialCategory = filterByMaterialCategory;
  }
  protected _filterByMaterialCategory = '';

  @Output()
  public filamentSelected = new EventEmitter<FilamentSummary>();

  constructor(
    private filamentService: FilamentService,
    private materialCategoryService: MaterialCategoryService
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    let defaultPageSize = 10;
    const savedPageSize = localStorage.getItem('filament_list_page_size');
    if (savedPageSize) {
      defaultPageSize = +savedPageSize;
    }

    this.materialCategoryService
      .getMaterialCategories()
      .subscribe((response) => {
        this.materialCategories = response;
      });

    this.pageSize = defaultPageSize;

    this.updateFilter();
  }

  public pageChange(pageEvent: PageEvent) {
    const newPageNumber = pageEvent.pageIndex + 1;
    const newPageSize = pageEvent.pageSize;

    localStorage.setItem('filament_list_page_size', newPageSize.toString(10));

    this.filamentService
      .getCurrentUserFilamentSummaries(newPageNumber, newPageSize)
      .subscribe((response) => {
        this.handlePagedList(response);
      });
  }

  public updateFilter() {
    if (this.pageSize) {
      localStorage.setItem(
        'filament_list_page_size',
        this.pageSize.toString(10)
      );
    }

    this.filamentService
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

  public toggleFavorite(filament: FilamentSummary) {
    const newIsFavorite = !filament.isFavorite;
    this.filamentService
      .changeFavorite(filament.id, newIsFavorite)
      .subscribe((_) => {
        filament.isFavorite = newIsFavorite;
      });
  }
}
