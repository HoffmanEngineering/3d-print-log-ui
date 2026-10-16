import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  output,
  input,
  linkedSignal,
  inject,
  signal,
} from '@angular/core';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { debounce } from 'lodash-es';

import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
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
import { toSortHeaderIds } from '../../core/utils/sort-header-ids';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatBadge } from '@angular/material/badge';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import {
  isRemainingTracked,
  RemainingPipe,
} from 'src/app/shared/pipes/remaining.pipe';
import { FilamentColorSwatchStylePipe } from '../pipes/filament-color-swatch-style.pipe';

@Component({
  selector: 'app-filament-list',
  templateUrl: './filament-list.component.html',
  styleUrls: ['./filament-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatButton,
    MatBadge,
    MatIcon,
    MatCheckbox,
    MatSelect,
    MatOption,
    MatChipListbox,
    MatChipOption,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatTooltip,
    MatSortHeader,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator,
    RemainingPipe,
    FilamentColorSwatchStylePipe,
  ],
})
export class FilamentListComponent implements OnInit {
  /** False for a spool with no starting weight, whose remaining is null. */
  protected readonly isRemainingTracked = isRemainingTracked;

  private filamentService = inject(FilamentService);
  private materialCategoryService = inject(MaterialCategoryService);

  public readonly multiSelect = input(false);

  readonly filaments = signal<FilamentSummary[]>([]);
  public selectedFilaments = new Map<string, FilamentSummary>();

  readonly pageSize = signal<number | undefined>(undefined);
  private currentPage: number | undefined;
  readonly totalCount = signal<number | undefined>(undefined);

  public displayedColumns: string[] = [
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
  ];

  public debouncedUpdateFilter;

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

  public showFavoritesOnly = false;
  public showLoadedFilamentOnly = false;

  public filterByColorPatterns: ColorPatternType[] = [];
  public filterByFinishTypes: FilamentFinishType[] = [];
  public filterByEffects: FilamentEffect[] = [];

  public readonly ColorPatternType = ColorPatternType;
  public readonly FilamentFinishType = FilamentFinishType;
  public readonly FilamentEffect = FilamentEffect;

  public isFilterPanelOpen =
    typeof window !== 'undefined' && window.innerWidth >= 600;

  public toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  public get activeFilterCount(): number {
    let count = 0;
    if (this.includeInactive) count++;
    if (this.showFavoritesOnly) count++;
    if (this.showLoadedFilamentOnly) count++;
    if (this.materialCategoryFilter()) count++;
    if (this.filterByColorPatterns.length) count++;
    if (this.filterByFinishTypes.length) count++;
    if (this.filterByEffects.length) count++;
    return count;
  }

  public searchText = '';

  readonly materialCategories = signal<MaterialCategory[]>([]);

  public readonly filterByMaterialCategory = input('');
  /** Starts from the parent's category and then follows the filter dropdown. */
  protected readonly materialCategoryFilter = linkedSignal(() =>
    this.filterByMaterialCategory()
  );

  public readonly filamentSelected = output<FilamentSummary>();

  public readonly selectionChanged = output<FilamentSummary[]>();

  constructor() {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    if (this.multiSelect()) {
      this.displayedColumns = ['select', ...this.displayedColumns];
    }

    let defaultPageSize = 10;
    const savedPageSize = localStorage.getItem('filament_list_page_size');
    if (savedPageSize) {
      defaultPageSize = +savedPageSize;
    }

    this.materialCategoryService
      .getMaterialCategories()
      .subscribe((response) => {
        this.materialCategories.set(response);
      });

    this.pageSize.set(defaultPageSize);

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
    const pageSize = this.pageSize();
    if (pageSize) {
      localStorage.setItem('filament_list_page_size', pageSize.toString(10));
    }

    this.filamentService
      .getCurrentUserFilamentSummaries(
        this.currentPage,
        pageSize,
        this.sortColumn,
        this.sortDirection,
        this.searchText,
        this.includeInactive,
        this.showFavoritesOnly,
        this.showLoadedFilamentOnly,
        this.materialCategoryFilter(),
        undefined,
        this.filterByColorPatterns.length
          ? this.filterByColorPatterns
          : undefined,
        this.filterByFinishTypes.length ? this.filterByFinishTypes : undefined,
        this.filterByEffects.length ? this.filterByEffects : undefined
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
    this.filaments.set(response.items);

    this.currentPage = response.paging.currentPage;
    this.pageSize.set(response.paging.pageSize);
    this.totalCount.set(response.paging.totalCount);
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

  public toggleSelection(filament: FilamentSummary) {
    if (this.selectedFilaments.has(filament.id)) {
      this.selectedFilaments.delete(filament.id);
    } else {
      this.selectedFilaments.set(filament.id, filament);
    }
    this.selectionChanged.emit(Array.from(this.selectedFilaments.values()));
  }

  public toggleColorPattern(pattern: ColorPatternType): void {
    const idx = this.filterByColorPatterns.indexOf(pattern);
    if (idx >= 0) this.filterByColorPatterns.splice(idx, 1);
    else this.filterByColorPatterns.push(pattern);
    this.debouncedUpdateFilter();
  }

  public toggleFinishType(finish: FilamentFinishType): void {
    const idx = this.filterByFinishTypes.indexOf(finish);
    if (idx >= 0) this.filterByFinishTypes.splice(idx, 1);
    else this.filterByFinishTypes.push(finish);
    this.debouncedUpdateFilter();
  }

  public toggleEffect(effect: FilamentEffect): void {
    const idx = this.filterByEffects.indexOf(effect);
    if (idx >= 0) this.filterByEffects.splice(idx, 1);
    else this.filterByEffects.push(effect);
    this.debouncedUpdateFilter();
  }

  public toggleFavorite(filament: FilamentSummary) {
    const newIsFavorite = !filament.isFavorite;
    this.filamentService
      .changeFavorite(filament.id, newIsFavorite)
      .subscribe((_) => {
        this.filaments.update((filaments) =>
          filaments.map((f) =>
            f.id === filament.id ? { ...f, isFavorite: newIsFavorite } : f
          )
        );
      });
  }
}
