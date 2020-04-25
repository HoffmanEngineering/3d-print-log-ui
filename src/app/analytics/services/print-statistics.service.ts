import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PrintStatus } from 'src/app/print/services/print.service';
import { environment } from 'src/environments/environment';

export interface PrintStatistic {
  id: number;
  printerId: number;
  startDate?: Date;
  estimatedPrintTimeInSeconds?: number;
  estimatedFilamentUsageMg?: number;
  printTimeInSeconds?: number;
  filamentUsageMg?: number;
  status: PrintStatus;
}

@Injectable({
  providedIn: 'root',
})
export class PrintStatisticsService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  getPrintStatistics(from: Date, to: Date): Observable<PrintStatistic[]> {
    const url = `${this.baseApi}/api/Prints/stats`;

    const params = new HttpParams()
      .set('fromDate', from.toISOString())
      .set('toDate', to.toISOString());

    return this.http.get<PrintStatistic[]>(url, { params });
  }
}
