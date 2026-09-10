import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { PagedList } from 'src/app/core/types/paging';
import { environment } from 'src/environments/environment';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
  FilamentSummary,
} from './filament.service';
import { PrinterCategory } from './printer-categories.service';
import { PrinterThumbnailStore } from '../stores/printer-thumbnail-store.service';
import { EntityImageTarget } from '../../shared/entity-images-panel/entity-image-gateway';

export interface PrinterSummary {
  id: number;
  name: string;
  make: string;
  model: string;
  isActive: boolean;
  wattageW?: number | null;
  printTimeInSeconds?: number | null;
  /** Signed thumbnail of the default photo, or null when the printer has none. */
  defaultImageThumbnailUrl?: string | null;
  category: PrinterCategory;
}

/**
 * Lightweight filament summary for printer list displays.
 * Excludes expensive calculated fields.
 */
export interface FilamentSummaryForPrinter {
  id: string;
  displayName: string;
  brand: string;
  materialType: string;
  colorName: string;
  colorHex: string;
  colorPattern: ColorPatternType;
  colors: string[];
  finishType: FilamentFinishType;
  effects: FilamentEffect[];
}

/**
 * Lightweight printer-filament relationship for summary views.
 */
export interface PrinterFilamentForSummary {
  id: string;
  filament: FilamentSummaryForPrinter;
}

/**
 * Simplified printer summary for list displays.
 * Excludes expensive calculated filament fields.
 */
export interface PrinterSummarySimple extends PrinterSummary {
  loadedFilaments: PrinterFilamentForSummary[];
}

/** One photo attached to a printer. */
export interface PrinterImage {
  id: number;
  url: string | null;
  thumbnailUrl: string | null;
  isDefault: boolean;
  displayOrder: number;
}

/**
 * @deprecated Use PrinterSummarySimple instead.
 * This interface includes expensive calculations not used by the UI.
 */
export interface PrinterSummaryWithFilament extends PrinterSummary {
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

  beamDiameter: number | null;

  isActive: boolean;

  loadedFilaments: PrinterFilamentSummaryDto[];

  category: PrinterCategory;

  bedWidthMm?: number;
  bedHeightMm?: number;
  bedDepthMm?: number;
  screenResolutionXPixels?: number;
  screenResolutionYPixels?: number;
  hasHeatedBed?: boolean;
  hasHeatedChamber?: boolean;
  wattageW?: number | null;

  /** Photos attached to this printer, ordered by displayOrder. */
  images?: PrinterImage[];
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

  nozzleDiameter?: number | null;

  filamentDiameter?: number | null;

  beamDiameter?: number | null;

  isActive: boolean;

  category: string;

  loadedFilaments: AddPrinterFilamentSummaryDto[];

  bedWidthMm?: number;
  bedHeightMm?: number;
  bedDepthMm?: number;
  screenResolutionXPixels?: number;
  screenResolutionYPixels?: number;
  hasHeatedBed?: boolean;
  hasHeatedChamber?: boolean;
  wattageW?: number | null;
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
  private readonly thumbnailStore = inject(PrinterThumbnailStore);

  constructor(private http: HttpClient) {}

  getCurrentUserPrinterSummaries(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchText: string = '',
    includeInactive: boolean = false
  ): Observable<PagedList<PrinterSummarySimple>> {
    const url = `${this.baseApi}/api/printers/summary`;

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10))
      .set('includeInactive', includeInactive.toString());

    if (searchText !== '') {
      params = params.set('searchText', searchText);
    }

    return this.http.get<PagedList<PrinterSummarySimple>>(url, {
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
      beamDiameter: printer.beamDiameter,
      isActive: printer.isActive,
      loadedFilaments: filamentUsage,
      category: printer.category.nickname,
      bedDepthMm: printer.bedDepthMm,
      bedHeightMm: printer.bedHeightMm,
      bedWidthMm: printer.bedWidthMm,
      screenResolutionXPixels: printer.screenResolutionXPixels,
      screenResolutionYPixels: printer.screenResolutionYPixels,
      hasHeatedBed: printer.hasHeatedBed,
      hasHeatedChamber: printer.hasHeatedChamber,
      wattageW: printer.wattageW,
    };

    return printDto;
  }

  // ----------------------------------------------------------------------------------
  // Printer images
  // ----------------------------------------------------------------------------------

  uploadPrinterImage(printerId: number, file: File): Observable<PrinterImage> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http
      .post<PrinterImage>(
        `${this.baseApi}/api/Printers/${printerId}/images`,
        formData
      )
      .pipe(tap(() => this.thumbnailStore.invalidate()));
  }

  deletePrinterImage(printerId: number, imageId: number): Observable<void> {
    return this.http
      .delete<void>(
        `${this.baseApi}/api/Printers/${printerId}/images/${imageId}`
      )
      .pipe(tap(() => this.thumbnailStore.invalidate()));
  }

  /** The API requires the complete, duplicate-free set of image IDs. */
  reorderPrinterImages(
    printerId: number,
    orderedImageIds: number[]
  ): Observable<void> {
    return this.http
      .put<void>(
        `${this.baseApi}/api/Printers/${printerId}/images/reorder`,
        orderedImageIds
      )
      .pipe(tap(() => this.thumbnailStore.invalidate()));
  }

  setPrinterImageAsDefault(
    printerId: number,
    imageId: number
  ): Observable<void> {
    return this.http
      .post<void>(
        `${this.baseApi}/api/Printers/${printerId}/images/${imageId}/set-as-default`,
        {}
      )
      .pipe(tap(() => this.thumbnailStore.invalidate()));
  }

  /**
   * Adapts this service to the shape EntityImagesPanelComponent consumes.
   *
   * The ID and the gateway travel together so a printer ID can never be handed to another
   * entity's endpoints. `id` is null on the create route, before the printer is saved.
   *
   * Every mutation invalidates the thumbnail store on the SUCCESS notification only, via
   * `tap` in the methods above: a failed mutation must leave the cached map alone, and
   * without invalidation an avatar keeps the old photo for up to an hour after the user
   * changes it.
   */
  imageTarget(id: number | null): EntityImageTarget<number> {
    return {
      id,
      gateway: {
        upload: (entityId, file) => this.uploadPrinterImage(entityId, file),
        delete: (entityId, imageId) =>
          this.deletePrinterImage(entityId, imageId),
        reorder: (entityId, ids) => this.reorderPrinterImages(entityId, ids),
        setDefault: (entityId, imageId) =>
          this.setPrinterImageAsDefault(entityId, imageId),
      },
    };
  }
}
