import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SinglePrintStatDto {
  stat: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsersPrintsStatsService {
  private readonly baseApi = environment.printLogApiUrl;
  constructor(private readonly http: HttpClient) {}

  getUsersTotalFilamentUsage(
    userId: number,
    from: Date,
    to: Date
  ): Observable<number> {
    const url = `${this.baseApi}/api/Users/${userId}/total-filament-usage`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    const params = new HttpParams()
      .set('fromDate', from.toISOString())
      .set('toDate', to.toISOString());

    return this.http
      .get<SinglePrintStatDto>(url, { params, headers })
      .pipe(map((result) => +(result.stat ?? 0)));
  }

  getUsersPrintCount(userId: number, from: Date, to: Date): Observable<number> {
    const url = `${this.baseApi}/api/Users/${userId}/print-count`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    const params = new HttpParams()
      .set('fromDate', from.toISOString())
      .set('toDate', to.toISOString());

    return this.http
      .get<SinglePrintStatDto>(url, { params, headers })
      .pipe(map((result) => +(result.stat ?? 0)));
  }

  getUsersTotalPrintTimeInSeconds(
    userId: number,
    from: Date,
    to: Date
  ): Observable<number> {
    const url = `${this.baseApi}/api/Users/${userId}/total-print-time`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    const params = new HttpParams()
      .set('fromDate', from.toISOString())
      .set('toDate', to.toISOString());

    return this.http
      .get<SinglePrintStatDto>(url, { params, headers })
      .pipe(map((result) => +(result.stat ?? 0)));
  }
}
