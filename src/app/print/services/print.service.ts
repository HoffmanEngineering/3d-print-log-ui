import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrinterSummary } from 'src/app/core/services/printer.service';

export enum PrintStatus {
  Pending,
  Printing,
  Success,
  Cancelled,
  Failed,
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
  printerId: number;
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

export interface PrintDetail {
  id: number;
  title: string;
  printerId;
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

/**
 * DTO to create a new print
 */
export interface AddPrintDTO {
  title: string;
  printerId: PrinterSummary;
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

@Injectable()
export class PrintService {
  private readonly baseApi = 'https://localhost:44378';

  constructor(private http: HttpClient) {}

  getPrintSummaries(): Observable<PrintSummary[]> {
    const url = `${this.baseApi}/api/Prints/summary`;
    return this.http.get<PrintSummary[]>(url);
  }

  getPrintDetail(id: number): Observable<PrintDetail> {
    const url = `${this.baseApi}/api/Prints/${id}`;
    return this.http.get<PrintDetailDTO>(url).pipe(
      map(newPrint => {
        const print: PrintDetail = {
          id: newPrint.id,
          estimatedFilamentUsageMg: newPrint.estimatedFilamentUsageMg,
          estimatedPrintTimeInSeconds: newPrint.estimatedPrintTimeInSeconds,
          filamentType: newPrint.filamentType,
          filamentUsageMg: newPrint.filamentUsageMg,
          notes: newPrint.notes,
          printTimeInSeconds: newPrint.printTimeInSeconds,
          printerId: newPrint.printerId,
          startDate: newPrint.startDate,
          status: newPrint.status,
          title: newPrint.title,
          url: newPrint.url,
        };
        return print;
      })
    );
  }

  addPrint(newPrint: PrintDetail): Observable<any> {
    const url = `${this.baseApi}/api/Prints/`;

    const printDto: AddPrintDTO = {
      estimatedFilamentUsageMg: newPrint.estimatedFilamentUsageMg,
      estimatedPrintTimeInSeconds: newPrint.estimatedPrintTimeInSeconds,
      filamentType: newPrint.filamentType,
      filamentUsageMg: newPrint.filamentUsageMg,
      notes: newPrint.notes,
      printTimeInSeconds: newPrint.printTimeInSeconds,
      printerId: newPrint.printerId,
      startDate: newPrint.startDate,
      status: newPrint.status,
      title: newPrint.title,
      url: newPrint.url,
    };

    return this.http.post<any>(url, newPrint);
  }

  updatePrint(print: PrintDetail): Observable<any> {
    const url = `${this.baseApi}/api/Prints/${print.id}`;

    const printer: any = {
      id: print.printerId,
    };

    const printDto: PrintDetailDTO = {
      estimatedFilamentUsageMg: print.estimatedFilamentUsageMg,
      estimatedPrintTimeInSeconds: print.estimatedPrintTimeInSeconds,
      filamentType: print.filamentType,
      filamentUsageMg: print.filamentUsageMg,
      notes: print.notes,
      printTimeInSeconds: print.printTimeInSeconds,
      printerId: print.printerId,
      startDate: print.startDate,
      status: print.status,
      title: print.title,
      url: print.url,
      id: print.id,
    };

    return this.http.put<any>(url, printDto);
  }
}
