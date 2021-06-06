import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { least } from 'd3';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';
import { SortDirection } from '../types/sort-request';
import { PrinterSummary } from './printer.service';

export interface FilamentDetail {
  id: string;
  displayName: string;
  brand: string;
  materialType: string;
  materialDensityGramPerCubicCm: number;
  colorName: string;
  colorHex: string;
  diameterMm: number | null;
  initialTotalWeightMg: number | null;
  initialNominalWeightMg: number | null;
  spoolWeightMg: number | null;
  tempRangeStart: number | null;
  tempRangeEnd: number | null;
  recommendedTemp: number | null;
  isActive: boolean;
  purchaseDate: string | null;
  purchaseLocation: string;
  purchasePriceValue: string;
  purchasePriceCurrency: string;
  notes: string;

  filamentAdjustments: FilamentAdjustment[];
}

export interface FilamentSummary {
  id: string;
  displayName: string;
  brand: string;
  materialType: string;
  materialDensityGramPerCubicCm: number;
  colorName: string;
  colorHex: string;
  recommendedTemp: number | null;
  isActive: boolean;
  notes: string;
  createdDate: string;
  filamentRemaining: number | null;
  filamentLengthRemainingInM: number | null;

  loadedInPrinter: PrinterSummary | null;
}

export interface FilamentAdjustment {
  /** GUID */
  id: string;
  filamentId: string;
  /**
   * Adjustment weights are added to total weight.
   * Positive Numbers are additions of filament to the roll, Negative Numbers are removal of filament from the roll.
   */
  amountMg: number;
  notes: string;
}

export enum FilamentSortColumns {
  DisplayName = 1,
  MaterialType = 2,
  FilamentRemaining = 3,
  Brand = 4,
  Color = 5,
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
    includeInactive?: boolean
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

    if (includeInactive !== undefined) {
      params = params.set('IncludeInactive', includeInactive.toString());
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
}
