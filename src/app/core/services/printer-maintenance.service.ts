import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';
import { SortDirection } from '../types/sort-request';
import { PrinterSummary } from './printer.service';

export enum PrinterMaintenanceSortColumn {
  Date = 1,
  Category = 2,
}

export interface AddPrinterMaintenanceDto {
  printerId: number;
  done: boolean;
  date: string;
  category: string;
  description: string;

  notes: string;
  priceValue: string;
}

export interface PutPrinterMaintenanceDto {
  id: string;
  printerId: number;
  done: boolean;
  date: string;
  category: string;
  description: string;

  notes: string;
  priceValue: string;
}

export interface PrinterMaintenanceDto {
  id: string;
  printerId: number;
  printer: PrinterSummary;
  done: boolean;
  date: string;
  category: string;
  description: string;

  notes: string;
  priceValue: string;
}

export interface PrinterMaintenanceCategoriesDto {
  categories: string[];
}

@Injectable({
  providedIn: 'root',
})
export class PrinterMaintenanceService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUserPrinterMaintenance(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchText: string = '',
    filterByPrinterIds: number[] = [],
    includeDone: boolean = true,
    includeNotDone: boolean = true,
    sortDirection = SortDirection.Desc,
    sortColumn = PrinterMaintenanceSortColumn.Date
  ): Observable<PagedList<PrinterMaintenanceDto>> {
    const url = `${this.baseApi}/api/PrinterMaintenance`;

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10))
      .set('SortColumn', sortColumn.toString(10))
      .set('SortDirection', sortDirection.toString(10))
      .set('includeDone', includeDone.toString())
      .set('includeNotDone', includeNotDone.toString());

    if (searchText !== '') {
      params = params.set('searchText', searchText);
    }

    if (filterByPrinterIds.length > 0) {
      for (const id of filterByPrinterIds) {
        params = params.append('filterByPrinterIds', id.toString());
      }
    }

    return this.http.get<PagedList<PrinterMaintenanceDto>>(url, {
      params,
    });
  }

  getPrinterMaintenanceEntry(entryId: string): Observable<any> {
    const url = `${this.baseApi}/api/PrinterMaintenance/${entryId}`;
    return this.http.get(url);
  }

  addPrinterMaintenanceEntry(
    entry: AddPrinterMaintenanceDto
  ): Observable<PrinterMaintenanceDto> {
    const url = `${this.baseApi}/api/PrinterMaintenance/`;
    return this.http.post<PrinterMaintenanceDto>(url, entry);
  }

  updatePrinterMaintenanceEntry(
    entry: PutPrinterMaintenanceDto
  ): Observable<PrinterMaintenanceDto> {
    const url = `${this.baseApi}/api/PrinterMaintenance/${entry.id}`;
    return this.http.put<PrinterMaintenanceDto>(url, entry);
  }

  deletePrinterMaintenanceEntry(entryId: string): Observable<any> {
    const url = `${this.baseApi}/api/PrinterMaintenance/${entryId}`;
    return this.http.delete(url);
  }

  getPrinterMaintenanceCategories(): Observable<PrinterMaintenanceCategoriesDto> {
    const url = `${this.baseApi}/api/PrinterMaintenance/categories`;
    return this.http.get<PrinterMaintenanceCategoriesDto>(url);
  }
}
