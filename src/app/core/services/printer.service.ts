import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PagedList } from 'src/app/core/types/paging';
import { environment } from 'src/environments/environment';
import { FilamentSummary } from './filament.service';

export interface PrinterSummary {
  id: number;
  name: string;
  make: string;
  model: string;
  isActive: boolean;
}

export interface PrinterDetail {
  id: number;
  make: string;
  model: string;

  name: string;

  description: string;

  nozzleDiameter: number | null;

  filamentDiameter: number | null;

  isActive: boolean;
}

export interface PrinterFilamentSummaryDto {
  /**
   * GUID
   */
  id: string;
  filament: FilamentSummary;
}

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUserPrinterSummaries(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchText: string = '',
    includeInactive: boolean = false
  ): Observable<PagedList<PrinterSummary>> {
    const url = `${this.baseApi}/api/printers/summary`;

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10))
      .set('includeInactive', includeInactive.toString());

    if (searchText !== '') {
      params = params.set('searchText', searchText);
    }

    return this.http.get<PagedList<PrinterSummary>>(url, { params });
  }

  getPrinterDetail(id: number): Observable<PrinterDetail> {
    const url = `${this.baseApi}/api/Printers/${id}`;
    return this.http.get<PrinterDetail>(url);
  }

  addPrinter(newPrinter: PrinterDetail): Observable<PrinterDetail> {
    const url = `${this.baseApi}/api/Printers/`;

    return this.http.post<PrinterDetail>(url, newPrinter);
  }

  updatePrinter(printer: PrinterDetail): Observable<PrinterDetail> {
    const url = `${this.baseApi}/api/Printers/${printer.id}`;

    return this.http.put<PrinterDetail>(url, printer);
  }

  getLoadedFilamentForPrinter(
    printerId: number
  ): Observable<PrinterFilamentSummaryDto[]> {
    const url = `${this.baseApi}/api/Printers/${printerId}/filament`;

    return this.http.get<PrinterFilamentSummaryDto[]>(url).pipe(
      map((response) => {
        return response?.length > 0 ? response : [];
      })
    );
  }
}
