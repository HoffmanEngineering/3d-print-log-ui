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

export interface PrintDetailDTO {
  id: number;
  title: string;
  printer: PrinterSummary;
  startDate?: Date;
  estimatedPrintTimeInSeconds?: number;
  estimatedFilamentUsageMg?: number;
  printTimeInSeconds?: number;
  filamentUsageMg?: number;
  filamentType: string;
  notes: string;
  url: string;
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

  getPrintDetail(id: number): Observable<PrintDetailDTO> {
    const url = `${this.baseApi}/api/Prints/${id}`;
    return this.http.get<PrintDetailDTO>(url);
  }
}
