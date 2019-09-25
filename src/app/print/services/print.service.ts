import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export enum PrintStatus {
  Pending,
  Printing,
  Success,
  Cancelled,
  Failed,
}

export interface PrinterSummary {
  id: number;
  make: string;
  model: string;
}

export interface PrintSummary {
  id: number;
  title: string;
  printer: PrinterSummary;
  startDate?: Date;
  status: PrintStatus;
}

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  private readonly baseApi = 'https://localhost:44378';

  constructor(private http: HttpClient) {}

  getPrintSummaries(): Observable<PrintSummary[]> {
    const url = `${this.baseApi}/api/Prints/summary`;
    return this.http.get<PrintSummary[]>(url);
  }
}
