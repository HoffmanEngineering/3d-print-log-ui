import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, fromEvent, Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, take } from 'rxjs/operators';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { environment } from 'src/environments/environment';

import moment from 'moment';

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

export enum PrintFilamentSourceMeasurement {
  Weight = 1,
  Length = 2,
  Volume = 3,
}

export interface PrintImage {
  id: number;
  isDefault: boolean;
  displayOrder: number;

  /**
   * base64 encoded URLs.
   */
  url?: string;
}

export interface PrintFilamentSummaryDto {
  /**
   * GUID
   */
  id: string;
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
   * GUID
   */
  id: string;
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
  comments: Comment[];
}

export interface PutPrintDetailDTO {
  id: number;
  title: string;
  printerId: number;
  startDate?: Date;
  estimatedPrintTimeInSeconds?: number;
  estimatedFilamentUsageMg?: number;
  printTimeInSeconds?: number;
  filamentUsage: PutPrintFilamentSummaryDto[];
  filamentUsageMg?: number;
  filamentType: string;
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;
  viewStatus: PrintViewStatus;
  allowComments: boolean;
}

export interface PrintDetail {
  id: number;
  title: string;
  printerId: number;
  printer?: PrinterSummary;
  startDate?: Date;
  estimatedPrintTimeInSeconds?: number;
  estimatedFilamentUsageMg?: number;
  printTimeInSeconds?: number;
  filamentUsageMg?: number;
  filamentType: string;
  filamentUsage: PrintFilamentSummaryDto[];
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;

  viewStatus: PrintViewStatus;
  allowComments: boolean;

  images?: PrintImage[];
  createdByUserId: number;
  comments: Comment[];
}

/**
 * DTO to create a new print
 */
export interface AddPrintDTO {
  title: string;
  printerId: number;
  startDate?: Date;
  estimatedPrintTimeInSeconds?: number;
  estimatedFilamentUsageMg?: number;
  printTimeInSeconds?: number;
  filamentUsageMg?: number;
  filamentType: string;
  filamentUsage: PrintFilamentSummaryDto[];
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;

  viewStatus: PrintViewStatus;
  allowComments: boolean;
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
    userId?: number
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
          formattedComment.createdDate = moment
            .utc(comment.createdDate)
            .toDate();
          formattedComment.updatedDate = moment
            .utc(comment.updatedDate)
            .toDate();
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
          startDate: newPrint.startDate
            ? moment(newPrint.startDate).toDate()
            : null,
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
    };

    return this.http.put<any>(url, printDto);
  }

  public updatePrintStatus(id: number, newStatus: PrintStatus) {
    const url = `${this.baseApi}/api/Prints/${id}/status/${newStatus}`;
    return this.http.put<any>(url, {});
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
        formattedComment.createdDate = moment.utc(comment.createdDate).toDate();
        formattedComment.updatedDate = moment.utc(comment.updatedDate).toDate();

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

      // If actual has an amount, use it.
      if (
        (fu.source == PrintFilamentSourceMeasurement.Length &&
          fu.lengthInM > 0) ||
        (!(fu.source == PrintFilamentSourceMeasurement.Length) &&
          fu.amountMg > 0)
      ) {
        const price = this.calculatePrintCost({
          currencySymbol,
          filament: fu.filament,
          source: fu.source,
          lengthM: fu.lengthInM,
          weightG: fu.amountMg > 0 ? fu.amountMg / 1000 : undefined,
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
          weightG:
            fu.estimatedAmountMg > 0 ? fu.estimatedAmountMg / 1000 : undefined,
          volumeMl: fu.estimatedVolumeMl,
          defaultFilamentPrice,
        });

        prices.push(price);
      }
    }

    // Once all prices are calculated, sum them up.
    let totalPrice: currency = undefined;

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
      return Intl.NumberFormat()
        .formatToParts(numberWithDecimalSeparator)
        .find((part) => part.type === 'decimal').value;
    }

    function getGroupSeparator() {
      const numberWithDecimalSeparator = 100000.1;
      return Intl.NumberFormat()
        .formatToParts(numberWithDecimalSeparator)
        .find((part) => part.type === 'group').value;
    }

    const currencyFormat = {
      symbol: currencySymbol,
      decimal: getDecimalSeparator(),
      separator: getGroupSeparator(),
    };

    let total: FilamentPrice = undefined;
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
      return Intl.NumberFormat()
        .formatToParts(numberWithDecimalSeparator)
        .find((part) => part.type === 'decimal').value;
    }

    function getGroupSeparator() {
      const numberWithDecimalSeparator = 100000.1;
      return Intl.NumberFormat()
        .formatToParts(numberWithDecimalSeparator)
        .find((part) => part.type === 'group').value;
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
    }
  }
}
