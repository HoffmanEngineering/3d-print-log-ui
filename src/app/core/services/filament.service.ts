import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';

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
}

@Injectable({
  providedIn: 'root',
})
export class FilamentService {
  private readonly baseApi = environment.printLogApiUrl;
  constructor(private http: HttpClient) {}

  getCurrentUserFilamentSummaries(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedList<FilamentSummary>> {
    const url = `${this.baseApi}/api/Filaments`;

    const params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10));

    return this.http.get<PagedList<FilamentSummary>>(url, { params });
  }

  getPrinterDetail(id: number): Observable<FilamentDetail> {
    const url = `${this.baseApi}/api/Filaments/${id}`;
    return this.http.get<FilamentDetail>(url);
  }
}
