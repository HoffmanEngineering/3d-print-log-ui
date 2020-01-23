import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedList } from 'src/app/core/types/paging';
import { environment } from 'src/environments/environment';

export interface PrinterSummary {
  id: number;
  make: string;
  model: string;
}

@Injectable()
export class PrinterService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUserPrinterSummaries(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedList<PrinterSummary>> {
    const url = `${this.baseApi}/api/printers/summary`;

    const params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10));

    return this.http.get<PagedList<PrinterSummary>>(url, { params });
  }
}
