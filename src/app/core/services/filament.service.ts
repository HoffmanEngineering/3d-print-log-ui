import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';
import { SortDirection } from '../types/sort-request';
import { EMPTY_GUID } from './print.service';
import { PrinterSummary } from './printer.service';
import { MaterialCategory } from './material-categories.service';

export enum FilamentSourceMeasurement {
  Weight = 1,
  Length = 2,
  Volume = 3,
}

export interface FilamentDetail {
  id: string;
  displayName: string;
  brand: string;
  materialCategoryNickname: string;
  materialType: string;
  materialDensityGramPerCubicCm: number;
  colorName: string;
  colorHex: string;
  diameterMm: number | null;
  initialTotalWeightMg: number | null;
  source: FilamentSourceMeasurement;
  initialNominalWeightMg: number | null;
  initialNominalLengthM: number | null;
  initialNominalVolumeMl: number | null;
  spoolWeightMg: number | null;
  tempRangeStart: number | null;
  tempRangeEnd: number | null;
  recommendedTemp: number | null;
  recommendedBedTemp: number | null;
  isActive: boolean;
  purchaseDate: string | null;
  purchaseLocation: string;
  purchasePriceValue: string;
  purchasePriceCurrency: string;
  purchaseNotes: string;
  storageLocation: string;

  initialLayerTimeS: number | null;
  layerTimeS: number | null;
  meltingTemperature: number | null;
  inertGas: string;
  materialRefreshRatio: number | null;
  notes: string;
  isFavorite: boolean;
  filamentAdjustments: FilamentAdjustment[];
}

export interface FilamentSummary {
  id: string;
  displayName: string;
  brand: string;
  materialCategoryNickname: string;
  materialType: string;
  materialDensityGramPerCubicCm: number;
  colorName: string;
  colorHex: string;
  recommendedTemp: number | null;
  isActive: boolean;
  notes: string;
  isFavorite: boolean;
  createdDate: string;
  filamentRemaining: number | null;
  filamentLengthRemainingInM: number | null;
  filamentVolumeRemainingInMl: number | null;
  purchasePriceValue: string;
  initialNominalWeightMg: number | null;
  diameterMm: number;
  loadedInPrinter: PrinterSummary | null;
  storageLocation: string;
  materialCategory: MaterialCategory;
}

export interface FilamentStorageLocations {
  storageLocations: string[];
}

export interface FilamentPurchaseLocations {
  purchaseLocations: string[];
}

export interface FilamentBrands {
  brands: string[];
}

export enum FilamentAdjustmentSourceMeasurement {
  Weight = 1,
  Length = 2,
  Volume = 3,
}

export interface FilamentAdjustment {
  /** GUID */
  id: string;
  filamentId: string;

  source: FilamentAdjustmentSourceMeasurement;

  /**
   * Adjustment weights are added to total weight.
   * Positive Numbers are additions of filament to the roll, Negative Numbers are removal of filament from the roll.
   */
  amountMg: number | null;

  /**
   * Adjustment lengths are added to total lengths.
   * Positive Numbers are additions of filament to the roll, Negative Numbers are removal of filament from the roll.
   */
  lengthInM: number | null;

  /**
   * Adjustment volume are added to total volume.
   * Positive Numbers are additions of filament to the roll, Negative Numbers are removal of filament from the roll.
   */
  volumeMl: number | null;

  notes: string;
}

export enum FilamentSortColumns {
  DisplayName = 1,
  MaterialType = 2,
  FilamentRemaining = 3,
  Brand = 4,
  Color = 5,
  StorageLocation = 6,
}

@Injectable({
  providedIn: 'root',
})
export class FilamentService {
  private readonly baseApi = environment.printLogApiUrl;
  constructor(private http: HttpClient) {}

  getCurrentUserFilamentSummaries(
    pageNumber: number = 1,
    pageSize: number = 10,
    sortColumn: FilamentSortColumns = FilamentSortColumns.FilamentRemaining,
    sortDirection: SortDirection = SortDirection.Desc,
    searchText?: string,
    includeInactive?: boolean,
    showFavoritesOnly?: boolean,
    showLoadedFilamentOnly?: boolean,
    filterByMaterialCategoryNickname?: string
  ): Observable<PagedList<FilamentSummary>> {
    const url = `${this.baseApi}/api/Filaments`;

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10))
      .set('SortColumn', sortColumn.toString())
      .set('SortDirection', sortDirection.toString());

    if (searchText !== undefined && searchText !== '') {
      params = params.set('SearchText', searchText.trim());
    }

    if (
      filterByMaterialCategoryNickname !== undefined &&
      filterByMaterialCategoryNickname !== ''
    ) {
      params = params.set(
        'filterByMaterialCategoryNickname',
        filterByMaterialCategoryNickname.trim()
      );
    }

    if (includeInactive !== undefined) {
      params = params.set('IncludeInactive', includeInactive.toString());
    }

    if (showFavoritesOnly !== undefined) {
      params = params.set('showFavoritesOnly', showFavoritesOnly.toString());
    }

    if (showLoadedFilamentOnly !== undefined) {
      params = params.set(
        'showLoadedFilamentOnly',
        showLoadedFilamentOnly.toString()
      );
    }

    return this.http.get<PagedList<FilamentSummary>>(url, { params });
  }

  getFilamentDetail(id: string): Observable<FilamentDetail> {
    const url = `${this.baseApi}/api/Filaments/${id}`;
    return this.http.get<FilamentDetail>(url);
  }

  addFilament(filament: FilamentDetail): Observable<FilamentDetail> {
    const url = `${this.baseApi}/api/Filaments/`;
    return this.http.post<FilamentDetail>(url, filament);
  }

  updateFilament(filament: FilamentDetail): Observable<FilamentDetail> {
    const url = `${this.baseApi}/api/Filaments/${filament.id}`;
    return this.http.put<FilamentDetail>(url, filament);
  }

  deleteFilament(filamentId: string): Observable<any> {
    const url = `${this.baseApi}/api/Filaments/${filamentId}`;
    return this.http.delete<FilamentDetail>(url);
  }

  /**
   * Add an adjustment to a filament. Optionally set the isActive flag.
   */
  addAdjustmentAmount(
    filamentId: string,
    adjustmentValue: number,
    note: string,
    isActive?: boolean
  ): Observable<FilamentDetail> {
    return this.getFilamentDetail(filamentId).pipe(
      map((filament) => {
        // Add an adjustment:
        const newAdjustment: FilamentAdjustment = {
          amountMg: adjustmentValue,
          source: FilamentAdjustmentSourceMeasurement.Weight,
          lengthInM: null,
          volumeMl: null,
          filamentId: filamentId,
          id: EMPTY_GUID,
          notes: note,
        };
        filament.filamentAdjustments = [
          ...filament.filamentAdjustments,
          newAdjustment,
        ];

        // Optionally allow an adjustment to mark the filament as inactive.
        if (isActive !== undefined) {
          filament.isActive = isActive;
        }

        return filament;
      }),
      mergeMap((filament) => {
        return this.updateFilament(filament);
      })
    );
  }

  /**
   * Add an adjustment to a filament. Optionally set the isActive flag.
   */
  changeFavorite(
    filamentId: string,
    isFavorite: boolean
  ): Observable<FilamentDetail> {
    return this.getFilamentDetail(filamentId).pipe(
      map((filament) => {
        filament.isFavorite = isFavorite;

        return filament;
      }),
      mergeMap((filament) => {
        return this.updateFilament(filament);
      })
    );
  }

  /**
   *
   * @returns A list of all storage locations for the current user.
   */
  getFilamentStorageLocations(): Observable<FilamentStorageLocations> {
    const url = `${this.baseApi}/api/Filaments/storage-locations`;
    return this.http.get<FilamentStorageLocations>(url);
  }

  /**
   *
   * @returns A list of all purchase locations for the current user.
   */
  getFilamentPurchaseLocations(): Observable<FilamentPurchaseLocations> {
    const url = `${this.baseApi}/api/Filaments/purchase-locations`;
    return this.http.get<FilamentPurchaseLocations>(url);
  }

  /**
   *
   * @returns A list of all brands of filament for the current user.
   */
  getFilamentBrands(): Observable<FilamentBrands> {
    const url = `${this.baseApi}/api/Filaments/brands`;
    return this.http.get<FilamentBrands>(url);
  }
}
