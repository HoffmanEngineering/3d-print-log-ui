import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AccuracyResponse,
  ActivityResponse,
  AnalyticsFilterValue,
  CostsResponse,
  MaterialsResponse,
  OverviewResponse,
  PrintersResponse,
} from '../models/analytics.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.printLogApiUrl}/api/analytics`;

  getOverview(filter: AnalyticsFilterValue): Observable<OverviewResponse> {
    return this.http.get<OverviewResponse>(`${this.baseUrl}/overview`, {
      params: this.toHttpParams(filter),
    });
  }

  getActivity(filter: AnalyticsFilterValue): Observable<ActivityResponse> {
    return this.http.get<ActivityResponse>(`${this.baseUrl}/activity`, {
      params: this.toHttpParams(filter),
    });
  }

  getPrinters(filter: AnalyticsFilterValue): Observable<PrintersResponse> {
    return this.http.get<PrintersResponse>(`${this.baseUrl}/printers`, {
      params: this.toHttpParams(filter),
    });
  }

  getMaterials(filter: AnalyticsFilterValue): Observable<MaterialsResponse> {
    return this.http.get<MaterialsResponse>(`${this.baseUrl}/materials`, {
      params: this.toHttpParams(filter),
    });
  }

  getCosts(filter: AnalyticsFilterValue): Observable<CostsResponse> {
    return this.http.get<CostsResponse>(`${this.baseUrl}/costs`, {
      params: this.toHttpParams(filter),
    });
  }

  getAccuracy(filter: AnalyticsFilterValue): Observable<AccuracyResponse> {
    return this.http.get<AccuracyResponse>(`${this.baseUrl}/accuracy`, {
      params: this.toHttpParams(filter),
    });
  }

  /**
   * Empty arrays and null dates are omitted rather than sent blank: the API reads an
   * absent range as all-time, and a blank repeated parameter would fail enum binding.
   */
  toHttpParams(filter: AnalyticsFilterValue): HttpParams {
    let params = new HttpParams()
      .set('timeZone', filter.timeZone)
      .set('granularity', filter.granularity)
      .set('comparePrevious', String(filter.comparePrevious));

    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);

    for (const id of filter.printerIds)
      params = params.append('printerIds', String(id));
    for (const id of filter.filamentIds)
      params = params.append('filamentIds', id);
    for (const id of filter.projectIds)
      params = params.append('projectIds', id);
    for (const s of filter.statuses)
      params = params.append('statuses', String(s));

    return params;
  }
}
