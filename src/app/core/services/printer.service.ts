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

export interface PrinterSummaryWithFilament {
  id: number;
  name: string;
  make: string;
  model: string;
  isActive: boolean;

  loadedFilaments: PrinterFilamentSummaryDto[];
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

  loadedFilaments: PrinterFilamentSummaryDto[];
}

export interface PrinterFilamentSummaryDto {
  /**
   * GUID
   */
  id: string;
  filament: FilamentSummary;
}

export interface AddPrinterDetailDto {
  id: number;
  make: string;
  model: string;

  name: string;

  description: string;

  nozzleDiameter: number | null;

  filamentDiameter: number | null;

  isActive: boolean;

  loadedFilaments: AddPrinterFilamentSummaryDto[];
}

export interface AddPrinterFilamentSummaryDto {
  /**
   * GUID
   */
  id: string;
  /**
   * GUID
   */
  filamentId: string;
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
  ): Observable<PagedList<PrinterSummaryWithFilament>> {
    const url = `${this.baseApi}/api/printers/summary`;

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10))
      .set('includeInactive', includeInactive.toString());

    if (searchText !== '') {
      params = params.set('searchText', searchText);
    }

    return this.http.get<PagedList<PrinterSummaryWithFilament>>(url, {
      params,
    });
  }

  getPrinterDetail(id: number): Observable<PrinterDetail> {
    const url = `${this.baseApi}/api/Printers/${id}`;
    return this.http.get<PrinterDetail>(url);
  }

  addPrinter(newPrinter: PrinterDetail): Observable<PrinterDetail> {
    const url = `${this.baseApi}/api/Printers/`;

    const dto: AddPrinterDetailDto = this.getAddPrinterDto(newPrinter);

    return this.http.post<PrinterDetail>(url, dto);
  }

  updatePrinter(printer: PrinterDetail): Observable<PrinterDetail> {
    const url = `${this.baseApi}/api/Printers/${printer.id}`;

    const dto: AddPrinterDetailDto = this.getAddPrinterDto(printer);

    return this.http.put<PrinterDetail>(url, dto);
  }

  deletePrinter(id: number): Observable<any> {
    const url = `${this.baseApi}/api/Printers/${id}`;

    return this.http.delete<PrinterDetail>(url);
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

  /**
   * Unload all the filament currently loaded into a printer.
   */
  unloadFilament(printerId: number): Observable<void> {
    const url = `${this.baseApi}/api/Printers/${printerId}/filament/unload`;

    return this.http.put<void>(url, {});
  }

  private getAddPrinterDto(printer: PrinterDetail): AddPrinterDetailDto {
    const filamentUsage: AddPrinterFilamentSummaryDto[] =
      printer.loadedFilaments.map((pf) => {
        const usage: AddPrinterFilamentSummaryDto = {
          id: pf.id,
          filamentId: pf.filament?.id ?? null,
        };

        return usage;
      });

    const printDto: AddPrinterDetailDto = {
      id: printer.id,
      name: printer.name,
      make: printer.make,
      model: printer.model,
      description: printer.description,
      nozzleDiameter: printer.nozzleDiameter,
      filamentDiameter: printer.filamentDiameter,
      isActive: printer.isActive,
      loadedFilaments: filamentUsage,
    };

    return printDto;
  }
}
