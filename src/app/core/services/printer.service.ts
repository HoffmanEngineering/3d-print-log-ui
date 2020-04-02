import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PrinterSummary {
  id: number;
  name: string;
  make: string;
  model: string;
}

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUserPrinterSummaries(): Observable<PrinterSummary[]> {
    const url = `${this.baseApi}/api/Users/me/printers`;
    return this.http.get<PrinterSummary[]>(url);
  }
}
