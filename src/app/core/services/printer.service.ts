import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PrinterSummary {
  id: number;
  make: string;
  model: string;
}

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  private readonly baseApi = 'https://localhost:44378';

  constructor(private http: HttpClient) {}

  getCurrentUserPrinterSummaries(): Observable<PrinterSummary[]> {
    const url = `${this.baseApi}/api/Users/me/printers`;
    return this.http.get<PrinterSummary[]>(url);
  }
}
