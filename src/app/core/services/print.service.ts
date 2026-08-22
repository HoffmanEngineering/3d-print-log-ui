import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, fromEvent, Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, take } from 'rxjs/operators';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { environment } from 'src/environments/environment';

import {
  ImageResizerService,
  IResizeImageOptions,
} from 'src/app/core/services/image-resizer.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { AddCommentDto, Comment } from './comment.service';
import { FilamentSummary } from './filament.service';
import currency from 'currency.js';

export enum PrintSummarySortColumn {
  Title = 1,
  StartDate = 2,
  FilamentUsage = 3,
}

export enum PrintStatus {
  Pending = 1,
  Printing = 2,
  Success = 3,
  Cancelled = 4,
  Failed = 5,
  PartialSuccess = 6,
}

export enum PrintViewStatus {
  Public = 1,
  Unlisted = 2,
  Private = 3,
}

/**
 * One set of field values to apply to many prints. Every field is optional; omitted
 * fields are left untouched. Enums serialize as their numeric value, matching the API,
 * which registers no string enum converter.
 */
export interface BulkUpdatePrintsRequest {
  printIds: number[];
  status?: PrintStatus;
  projectId?: string;
  viewStatus?: PrintViewStatus;
  printerId?: number;
  allowComments?: boolean;
  allowFileDownloads?: boolean;
  /** Fields to reset to null. Only `projectId` is clearable. */
  clear?: 'projectId'[];
}

/**
 * The per-id outcome of a bulk operation. The request is a 200 even when some ids could
 * not be acted on, so this body is what says which. `reason` is either "NotFound" or
 * "Forbidden".
 */
export interface BulkPrintResult {
  succeeded: number[];
  failed: { id: number; reason: string }[];
}

export enum PrintFilamentSourceMeasurement {
  AsRecorded = 0,
  Weight = 1,
  Length = 2,
  Volume = 3,
}

export interface PrintImage {
  /** Null for an image extracted from gcode that the API has not saved yet. */
  id: number | null;
  isDefault: boolean;
  displayOrder: number;

  /**
   * base64 encoded URLs.
   */
  url?: string;
}

export interface PrintFilamentSummaryDto {
  /**
   * GUID. Null for a row parsed from gcode that the API has not saved yet.
   */
  id: string | null;
  filament: FilamentSummary;

  amountMg?: number;
  lengthInM?: number;
  volumeMl?: number;

  estimatedAmountMg?: number;
  estimatedLengthInM?: number;
  estimatedVolumeMl?: number;

  source: PrintFilamentSourceMeasurement;
  estimatedSource: PrintFilamentSourceMeasurement;

  notes?: string;
}

export interface PutPrintFilamentSummaryDto {
  /**
   * GUID. Null for a row that has not been saved yet.
   */
  id: string | null;
  filamentId?: string;

  amountMg?: number;
  lengthInM?: number;
  volumeMl?: number;

  estimatedAmountMg?: number;
  estimatedLengthInM?: number;
  estimatedVolumeMl?: number;

  source: PrintFilamentSourceMeasurement;
  estimatedSource: PrintFilamentSourceMeasurement;

  notes?: string;
}

export interface PrintSummary {
  id: number;
  title: string;
  printer: PrinterSummary;
  startDate?: Date;
  status: PrintStatus;

  defaultPrintImageId: number;
  createdByUserId: number;
  estimatedPrintTimeInSeconds: number | null;
  printTimeInSeconds: number | null;

  sumActualFilamentWeightMg: number;
  sumEstimatedFilamentWeightMg: number;
  totalFilamentWeightMg: number;
  filamentUsage: PrintFilamentSummaryDto[];

  /**
   * The number of comments on the print.
   */
  commentCount: number;

  projectId?: string;
  projectName?: string;
  projectStatus?: import('./project.service').ProjectStatus;
}

export interface PrintDetailDTO {
  id: number;
  title: string;
  printerId: number;
  printer: PrinterSummary;
  startDate?: Date;
  estimatedPrintTimeInSeconds?: number;
  estimatedFilamentUsageMg?: number;
  printTimeInSeconds?: number;
  filamentUsage: PrintFilamentSummaryDto[];
  filamentUsageMg?: number;
  filamentType: string;
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;
  viewStatus: PrintViewStatus;
  images?: PrintImage[];
  createdByUserId: number;
  allowComments: boolean;
  allowFileDownloads?: boolean;
  comments: Comment[];
  projectId?: string;
  projectName?: string;
}

/**
 * The payload this client sends on update. The nullable fields mirror
 * `PrintDetail`, which can still be holding an unsaved scaffold -- the API's own
 * validation is the authority on what it accepts, so this describes what we can
 * actually send rather than over-claiming.
 */
export interface PutPrintDetailDTO {
  id: number | null;
  title: string;
  printerId: number | null;
  startDate?: Date | null;
  estimatedPrintTimeInSeconds?: number | null;
  estimatedFilamentUsageMg?: number | null;
  printTimeInSeconds?: number | null;
  filamentUsage: PutPrintFilamentSummaryDto[];
  filamentUsageMg?: number | null;
  filamentType: string;
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;
  viewStatus: PrintViewStatus | null;
  allowComments: boolean | null;
  allowFileDownloads?: boolean;
  projectId?: string;
  newProjectName?: string;
}

/**
 * A print being viewed or edited. Unlike `PrintDetailDTO`, which always
 * describes a print the API has already saved, this also models an unsaved one:
 * the slicer parsers and the new-print flow build a `PrintDetail` before an id,
 * printer or creator exists, so those fields are genuinely nullable here.
 */
export interface PrintDetail {
  id: number | null;
  title: string;
  printerId: number | null;
  printer?: PrinterSummary;
  startDate?: Date | null;
  estimatedPrintTimeInSeconds?: number | null;
  estimatedFilamentUsageMg?: number | null;
  printTimeInSeconds?: number | null;
  filamentUsageMg?: number | null;
  filamentType: string;
  filamentUsage: PrintFilamentSummaryDto[];
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;

  viewStatus: PrintViewStatus | null;
  allowComments: boolean | null;
  allowFileDownloads?: boolean;

  images?: PrintImage[];
  createdByUserId: number | null;
  comments: Comment[];
  projectId?: string;
  projectName?: string;
  newProjectName?: string;
}

/**
 * DTO to create a new print
 */
/** The payload this client sends on create. See `PutPrintDetailDTO`. */
export interface AddPrintDTO {
  title: string;
  printerId: number | null;
  startDate?: Date | null;
  estimatedPrintTimeInSeconds?: number | null;
  estimatedFilamentUsageMg?: number | null;
  printTimeInSeconds?: number | null;
  filamentUsageMg?: number | null;
  filamentType: string;
  filamentUsage: PrintFilamentSummaryDto[];
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;

  viewStatus: PrintViewStatus | null;
  allowComments: boolean | null;
  projectId?: string;
  newProjectName?: string;
}

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export type FilamentPriceValid = {
  valid: true;
  price: currency;
  formattedPrice: string;
  symbol: string;
  usesDefaultPrice: boolean;
};

export type FilamentPriceInvalid = {
  valid: false;
  message: string;
};

export type FilamentPrice = FilamentPriceValid | FilamentPriceInvalid;

export type ElectricityCostValid = {
  valid: true;
  cost: currency;
  formattedCost: string;
  symbol: string;
  usesDefaultWattage: boolean;
  wattageW: number;
  printTimeHours: number;
};

export type ElectricityCostInvalid = {
  valid: false;
  message: string;
};

export type ElectricityCost = ElectricityCostValid | ElectricityCostInvalid;

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  private readonly baseApi = environment.printLogApiUrl;

  private readonly IMAGE_QUALITY = 0.9;
  private readonly IMAGE_MAX_SIZE_PX = 1280;

  constructor(
    private http: HttpClient,
    private imageResizer: ImageResizerService
  ) {}

  getPrintSummaries(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchText: string = '',
    filterByStatus: PrintStatus | null = null,
    filterByPrinterIds: number[] = [],
    filterByFilamentIds: string[] = [],
    sortDirection = SortDirection.Desc,
    sortColumn = PrintSummarySortColumn.StartDate,
    userId?: number,
    filterByProjectId?: string,
    /**
     * Half-open [fromDate, toDate), matching the API and the analytics contract. Passed as an
     * object rather than two more positional arguments: this signature already has ten, and the
     * pair is meaningless split apart.
     */
    dateRange?: { fromDate: string; toDate: string }
  ): Observable<PagedList<PrintSummary>> {
    const url = `${this.baseApi}/api/Prints/summary`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10))
      .set('SortColumn', sortColumn.toString(10))
      .set('SortDirection', sortDirection.toString(10));

    if (searchText !== '') {
      params = params.set('searchText', searchText);
    }

    if (filterByStatus !== null && filterByStatus >= 0) {
      params = params.set('filterByStatus', filterByStatus.toString(10));
    }

    if (filterByPrinterIds?.length > 0) {
      for (const id of filterByPrinterIds) {
        params = params.append('filterByPrinterIds', id.toString());
      }
    }

    if (filterByFilamentIds?.length > 0) {
      for (const id of filterByFilamentIds) {
        params = params.append('filterByFilamentIds', id);
      }
    }

    if (userId !== undefined) {
      params = params.set('userId', userId.toString(10));
    }

    if (filterByProjectId) {
      params = params.set('filterByProjectId', filterByProjectId);
    }

    // Both ends or neither: the API rejects a half-supplied range with a 400, and sending one
    // end alone would filter in a way the user never asked for.
    if (dateRange?.fromDate && dateRange?.toDate) {
      params = params
        .set('fromDate', dateRange.fromDate)
        .set('toDate', dateRange.toDate);
    }

    return this.http.get<PagedList<PrintSummary>>(url, { params, headers });
  }

  getPrintDetail(id: number): Observable<PrintDetail> {
    const url = `${this.baseApi}/api/Prints/${id}`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    return this.http.get<PrintDetailDTO>(url, { headers }).pipe(
      map((newPrint) => {
        const comments: Comment[] = [];
        for (const comment of newPrint.comments) {
          const formattedComment: Comment = { ...comment };
          formattedComment.createdDate = new Date(comment.createdDate);
          formattedComment.updatedDate = new Date(comment.updatedDate);
          comments.push(formattedComment);
        }

        const print: PrintDetail = {
          id: newPrint.id,
          estimatedFilamentUsageMg: newPrint.estimatedFilamentUsageMg,
          estimatedPrintTimeInSeconds: newPrint.estimatedPrintTimeInSeconds,
          filamentType: newPrint.filamentType,
          filamentUsageMg: newPrint.filamentUsageMg,
          notes: newPrint.notes,
          printTimeInSeconds: newPrint.printTimeInSeconds,
          printerId: newPrint.printerId,
          printer: newPrint.printer,
          startDate: newPrint.startDate ? new Date(newPrint.startDate) : null,
          status: newPrint.status,
          title: newPrint.title,
          url: newPrint.url,
          fileName: newPrint.fileName,
          viewStatus: newPrint.viewStatus,
          images: newPrint.images || [],
          filamentUsage: newPrint.filamentUsage || [],
          createdByUserId: newPrint.createdByUserId,
          comments,
          allowComments: newPrint.allowComments,
          allowFileDownloads: newPrint.allowFileDownloads ?? false,
          projectId: newPrint.projectId,
          projectName: newPrint.projectName,
        };
        return print;
      })
    );
  }

  addPrint(newPrint: Omit<PrintDetail, 'comments'>): Observable<any> {
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
      fileName: newPrint.fileName,
      viewStatus: newPrint.viewStatus,
      allowComments: newPrint.allowComments,
      filamentUsage: newPrint.filamentUsage,
      projectId: newPrint.projectId,
      newProjectName: newPrint.newProjectName,
    };

    return this.http.post<any>(url, printDto);
  }

  updatePrint(print: Omit<PrintDetail, 'comments'>): Observable<any> {
    const url = `${this.baseApi}/api/Prints/${print.id}`;

    const filamentUsage: PutPrintFilamentSummaryDto[] = print.filamentUsage.map(
      (pf) => {
        const usage: PutPrintFilamentSummaryDto = {
          id: pf.id,
          filamentId: pf.filament?.id ?? null,
          estimatedAmountMg: pf.estimatedAmountMg,
          estimatedLengthInM: pf.estimatedLengthInM,
          estimatedVolumeMl: pf.estimatedVolumeMl,
          estimatedSource: pf.estimatedSource,
          amountMg: pf.amountMg,
          lengthInM: pf.lengthInM,
          volumeMl: pf.volumeMl,
          source: pf.source,
          notes: pf.notes,
        };

        return usage;
      }
    );

    const printDto: PutPrintDetailDTO = {
      estimatedFilamentUsageMg: print.estimatedFilamentUsageMg,
      estimatedPrintTimeInSeconds: print.estimatedPrintTimeInSeconds,
      filamentType: print.filamentType,
      filamentUsageMg: print.filamentUsageMg,
      filamentUsage,
      notes: print.notes,
      printTimeInSeconds: print.printTimeInSeconds,
      printerId: print.printerId,
      startDate: print.startDate,
      status: print.status,
      title: print.title,
      url: print.url,
      fileName: print.fileName,
      id: print.id,
      viewStatus: print.viewStatus,
      allowComments: print.allowComments,
      allowFileDownloads: print.allowFileDownloads,
      projectId: print.projectId,
      newProjectName: print.newProjectName,
    };

    return this.http.put<any>(url, printDto);
  }

  public updatePrintStatus(id: number, newStatus: PrintStatus) {
    const url = `${this.baseApi}/api/Prints/${id}/status/${newStatus}`;
    return this.http.put<any>(url, {});
  }

  /**
   * Applies one set of field values to many prints in a single request. Individual ids
   * that could not be acted on come back in `failed`; the request itself is still a 200.
   */
  public bulkUpdatePrints(
    request: BulkUpdatePrintsRequest
  ): Observable<BulkPrintResult> {
    const url = `${this.baseApi}/api/Prints/bulk-update`;
    return this.http.post<BulkPrintResult>(url, request);
  }

  /**
   * Deletes many prints in a single request. An id that no longer exists comes back in
   * `succeeded` - the goal state is that the print is gone.
   */
  public bulkDeletePrints(printIds: number[]): Observable<BulkPrintResult> {
    const url = `${this.baseApi}/api/Prints/bulk-delete`;
    return this.http.post<BulkPrintResult>(url, { printIds });
  }

  deletePrint(id: number): Observable<any> {
    const url = `${this.baseApi}/api/Prints/${id}`;

    return this.http.delete<any>(url);
  }

  public uploadPrintImageFromDataUrl(
    printId: number,
    dataUrl: string,
    isDefault = false
  ) {
    const dataURItoBlob = (dataURI: string) => {
      const bytes =
        dataURI.split(',')[0].indexOf('base64') >= 0
          ? atob(dataURI.split(',')[1])
          : unescape(dataURI.split(',')[1]);
      const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
      const max = bytes.length;
      const ia = new Uint8Array(max);
      for (let i = 0; i < max; i++) {
        ia[i] = bytes.charCodeAt(i);
      }
      return new Blob([ia], { type: mime });
    };
    // Since its a print image, we assume the mime type to be image/{ext}, so grab it.
    const ext = dataUrl.split(',')[0].split(':')[1].split(';')[0].split('/')[1];
    const fileName = `printImage.${ext}`;
    const blob = dataURItoBlob(dataUrl);

    const formData: FormData = new FormData();
    formData.append('image', blob, fileName);
    formData.append('isDefault', isDefault.toString());

    const url = `${this.baseApi}/api/Prints/${printId}/image`;

    return this.http.post(url, formData);
  }

  public uploadPrintImage(printId: number, file: File, isDefault = false) {
    const url = `${this.baseApi}/api/Prints/${printId}/image`;

    const settings: IResizeImageOptions = {
      file,
      maxSize: this.IMAGE_MAX_SIZE_PX,
      imageQuality: this.IMAGE_QUALITY,
    };

    return from(this.imageResizer.resizeImage(settings)).pipe(
      switchMap((reducedImage) => {
        const formData: FormData = new FormData();
        formData.append('image', reducedImage, file.name);
        formData.append('isDefault', isDefault.toString());

        return this.http.post(url, formData);
      })
    );
  }

  /**
   * Returns the print's image as a base64 encoded dataUrl
   */
  public getPrintImage(printId: number, imageId: number): Observable<string> {
    const url = `${this.baseApi}/api/Prints/${printId}/image/${imageId}`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    return this.http.get(url, { headers, responseType: 'blob' }).pipe(
      concatMap((image) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        return fromEvent(reader, 'load');
      }),
      take(1),
      map((e) => {
        // result includes identifier 'data:image/png;base64,' plus the base64 data
        const data = (e.target as FileReader).result as string;

        return data;
      }),
      catchError((err) => of(''))
    );
  }

  public setImageAsDefault(printId: number, imageId: number) {
    const url = `${this.baseApi}/api/Prints/${printId}/image/${imageId}/set-as-default`;

    return this.http.post(url, {});
  }

  public deleteImage(printId: number, imageId: number) {
    const url = `${this.baseApi}/api/Prints/${printId}/image/${imageId}`;

    return this.http.delete(url);
  }

  reorderImages(
    printId: number,
    images: { imageId: number; displayOrder: number }[]
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseApi}/api/Prints/${printId}/images/reorder`,
      { images }
    );
  }

  public addPrintComment(printId: number, commentBody: string) {
    const url = `${this.baseApi}/api/Prints/${printId}/comment`;

    const dto: AddCommentDto = {
      body: commentBody,
    };

    return this.http.post<Comment>(url, dto).pipe(
      map((comment) => {
        const formattedComment: Comment = { ...comment };
        formattedComment.createdDate = new Date(comment.createdDate);
        formattedComment.updatedDate = new Date(comment.updatedDate);

        return formattedComment;
      })
    );
  }

  /**
   * Delete a print comment.
   */
  public deletePrintComment(printId: number, commentId: number) {
    const url = `${this.baseApi}/api/Prints/${printId}/comment/${commentId}`;

    return this.http.delete<Comment>(url);
  }

  public exportAllPrintsAsCsv() {
    const url = `${this.baseApi}/api/Prints/csv`;
    return this.http.get(url, { responseType: 'blob' });
  }

  // Calculates all individual filament costs, as well as the sum total of all
  public calculateTotalPrintCost(
    filamentUsage: PrintFilamentSummaryDto[],
    currencySymbol: string,
    defaultFilamentPrice?: string
  ) {
    const prices: FilamentPrice[] = [];

    for (const fu of filamentUsage) {
      if (fu.filament === null) {
        continue;
      }

      // If actual has an amount, use it. The check must be made against the measurement the
      // row is actually sourced from: a Volume-sourced row records volumeMl and leaves amountMg
      // null, so testing amountMg alone sent it down the estimated path and — when there was no
      // estimate — reported a confident $0.00 instead of its real cost.
      // Pinned by print-cost-fixtures.spec.ts against the shared corpus.
      const hasActual =
        fu.source == PrintFilamentSourceMeasurement.Length
          ? (fu.lengthInM ?? 0) > 0
          : fu.source == PrintFilamentSourceMeasurement.Volume
            ? (fu.volumeMl ?? 0) > 0
            : (fu.amountMg ?? 0) > 0;

      if (hasActual) {
        const price = this.calculatePrintCost({
          currencySymbol,
          filament: fu.filament,
          source: fu.source,
          lengthM: fu.lengthInM,
          weightG: fu.amountMg ? fu.amountMg / 1000 : undefined,
          volumeMl: fu.volumeMl,
          defaultFilamentPrice,
        });

        prices.push(price);
      } else {
        const price = this.calculatePrintCost({
          currencySymbol,
          filament: fu.filament,
          source: fu.estimatedSource,
          lengthM: fu.estimatedLengthInM,
          weightG: fu.estimatedAmountMg
            ? fu.estimatedAmountMg / 1000
            : undefined,
          volumeMl: fu.estimatedVolumeMl,
          defaultFilamentPrice,
        });

        prices.push(price);
      }
    }

    // Once all prices are calculated, sum them up.
    let totalPrice: currency | undefined = undefined;

    for (const price of prices) {
      if (price.valid && !isNaN(price.price.value)) {
        if (totalPrice == undefined) {
          totalPrice = price.price;
        } else {
          totalPrice = totalPrice.add(price.price);
        }
      }
    }

    function getDecimalSeparator() {
      const numberWithDecimalSeparator = 100000.1;
      return (
        Intl.NumberFormat()
          .formatToParts(numberWithDecimalSeparator)
          .find((part) => part.type === 'decimal')?.value ?? '.'
      );
    }

    function getGroupSeparator() {
      const numberWithDecimalSeparator = 100000.1;
      return (
        Intl.NumberFormat()
          .formatToParts(numberWithDecimalSeparator)
          .find((part) => part.type === 'group')?.value ?? ','
      );
    }

    const currencyFormat = {
      symbol: currencySymbol,
      decimal: getDecimalSeparator(),
      separator: getGroupSeparator(),
    };

    let total: FilamentPrice | undefined = undefined;
    if (totalPrice) {
      total = {
        formattedPrice: totalPrice.format(currencyFormat),
        price: totalPrice,
        symbol: currencySymbol,
        usesDefaultPrice: prices.some(
          (price) => price.valid && price.usesDefaultPrice
        ),
        valid: true,
      };
    } else {
      total = {
        valid: false,
        message: 'Cannot calculate total',
      };
    }

    return {
      prices,
      total,
    };
  }

  public calculateElectricityCost({
    printTimeSeconds,
    kwhRate,
    printerWattageW,
    defaultWattageW,
    currencySymbol,
  }: {
    printTimeSeconds: number | null | undefined;
    kwhRate: string | null | undefined;
    printerWattageW: number | null | undefined;
    defaultWattageW: string | null | undefined;
    currencySymbol: string;
  }): ElectricityCost {
    if (!printTimeSeconds || printTimeSeconds <= 0) {
      return { valid: false, message: '' };
    }

    if (!kwhRate) {
      return { valid: false, message: '(Electricity rate not set)' };
    }

    const effectiveWattage =
      printerWattageW != null
        ? printerWattageW
        : defaultWattageW != null
          ? Number(defaultWattageW)
          : null;

    if (effectiveWattage == null || isNaN(effectiveWattage)) {
      return { valid: false, message: '(Printer wattage not set)' };
    }

    const usesDefaultWattage = printerWattageW == null;
    const printTimeHours = printTimeSeconds / 3600;
    const kwhUsed = (effectiveWattage / 1000) * printTimeHours;
    const cost = currency(kwhUsed * Number(kwhRate));

    function getDecimalSeparator() {
      return (
        Intl.NumberFormat()
          .formatToParts(100000.1)
          .find((part) => part.type === 'decimal')?.value ?? '.'
      );
    }

    function getGroupSeparator() {
      return (
        Intl.NumberFormat()
          .formatToParts(100000.1)
          .find((part) => part.type === 'group')?.value ?? ','
      );
    }

    const currencyFormat = {
      symbol: currencySymbol,
      decimal: getDecimalSeparator(),
      separator: getGroupSeparator(),
    };

    return {
      valid: true,
      cost,
      formattedCost: cost.format(currencyFormat),
      symbol: currencySymbol,
      usesDefaultWattage,
      wattageW: effectiveWattage,
      printTimeHours,
    };
  }

  /** Returns the  */
  public calculatePrintCost({
    filament,
    source,
    weightG,
    lengthM,
    volumeMl,
    currencySymbol,
    defaultFilamentPrice,
  }: {
    filament: FilamentSummary;
    source: PrintFilamentSourceMeasurement;
    weightG?: string | number;
    lengthM?: string | number;
    volumeMl?: string | number;
    currencySymbol: string;
    defaultFilamentPrice?: string;
  }): FilamentPrice {
    if (filament === null) {
      return { valid: false, message: '' };
    }

    const defaultPrice = defaultFilamentPrice ?? null;

    const filamentPrice =
      filament.purchasePriceValue != null && filament.purchasePriceValue !== ''
        ? filament.purchasePriceValue
        : defaultPrice;

    if (filamentPrice == null) {
      return { valid: false, message: '(Material price not set)' };
    }

    const filamentWeightMg = filament.initialNominalWeightMg;

    if (filamentWeightMg == null || filamentWeightMg === 0) {
      return { valid: false, message: '(Material initial weight not set)' };
    }

    // Save if we are using a default price
    const isUsingDefaultFilamentPrice = filamentPrice === defaultPrice;

    const pricePerGram = Number(filamentPrice) / (filamentWeightMg / 1000.0);

    function getDecimalSeparator() {
      const numberWithDecimalSeparator = 100000.1;
      return (
        Intl.NumberFormat()
          .formatToParts(numberWithDecimalSeparator)
          .find((part) => part.type === 'decimal')?.value ?? '.'
      );
    }

    function getGroupSeparator() {
      const numberWithDecimalSeparator = 100000.1;
      return (
        Intl.NumberFormat()
          .formatToParts(numberWithDecimalSeparator)
          .find((part) => part.type === 'group')?.value ?? ','
      );
    }

    const currencyFormat = {
      symbol: currencySymbol,
      decimal: getDecimalSeparator(),
      separator: getGroupSeparator(),
    };

    if (source == PrintFilamentSourceMeasurement.Weight) {
      // Use Weights, ezpz

      if (isNaN(currency(pricePerGram * Number(weightG)).value)) {
        return { message: '(Price not valid)', valid: false };
      }

      return {
        valid: true,
        price: currency(pricePerGram * Number(weightG)),
        formattedPrice: currency(pricePerGram * Number(weightG)).format(
          currencyFormat
        ),
        symbol: currencySymbol,
        usesDefaultPrice: isUsingDefaultFilamentPrice,
      };
    } else if (source == PrintFilamentSourceMeasurement.Length) {
      // Calculate from length.
      const diameterMm = filament.diameterMm;
      const areaSqM = Math.PI * Math.pow(diameterMm / 1000.0, 2) * (1 / 4);

      const densityGramPerCubicM =
        filament.materialDensityGramPerCubicCm * 1000000;

      if (lengthM === undefined) {
        return { message: '(Price not valid)', valid: false };
      }

      const gramsUsed = areaSqM * +lengthM * densityGramPerCubicM;

      if (isNaN(currency(pricePerGram * gramsUsed).value)) {
        return { message: '(Price not valid)', valid: false };
      }

      return {
        valid: true,
        price: currency(pricePerGram * gramsUsed),
        formattedPrice: currency(pricePerGram * gramsUsed).format(
          currencyFormat
        ),
        symbol: currencySymbol,
        usesDefaultPrice: isUsingDefaultFilamentPrice,
      };
    } else if (source === PrintFilamentSourceMeasurement.Volume) {
      if (volumeMl === undefined) {
        return { message: '(Price not valid)', valid: false };
      }

      const amountMg =
        +volumeMl * filament.materialDensityGramPerCubicCm * 1000;
      const amountG = amountMg / 1000;

      if (isNaN(currency(pricePerGram * Number(amountG)).value)) {
        return { message: '(Price not valid)', valid: false };
      }

      return {
        valid: true,
        price: currency(pricePerGram * Number(amountG)),
        formattedPrice: currency(pricePerGram * Number(amountG)).format(
          currencyFormat
        ),
        symbol: currencySymbol,
        usesDefaultPrice: isUsingDefaultFilamentPrice,
      };
    } else {
      return { valid: false, message: '(Unknown measurement source)' };
    }
  }
}
