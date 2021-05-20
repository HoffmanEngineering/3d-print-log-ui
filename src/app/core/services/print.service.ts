import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, fromEvent, Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, take } from 'rxjs/operators';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { environment } from 'src/environments/environment';

import * as moment from 'moment';

import {
  ImageResizerService,
  IResizeImageOptions,
} from 'src/app/core/services/image-resizer.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { AddCommentDto, Comment } from './comment.service';
import { FilamentSummary } from './filament.service';

export enum PrintSummarySortColumn {
  Title = 1,
  StartDate = 2,
}

export enum PrintStatus {
  Pending = 1,
  Printing = 2,
  Success = 3,
  Cancelled = 4,
  Failed = 5,
}

export enum PrintViewStatus {
  Public = 1,
  Unlisted = 2,
  Private = 3,
}

export interface PrintImage {
  id: number;
  isDefault: boolean;

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
  isActualLengthSource: boolean;
  estimatedAmountMg?: number;
  estimatedLengthInM?: number;

  isEstimatedLengthSource: boolean;

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
  isActualLengthSource: boolean;
  estimatedAmountMg?: number;
  estimatedLengthInM?: number;

  isEstimatedLengthSource: boolean;

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

    if (userId !== undefined) {
      params = params.set('userId', userId.toString(10));
    }

    return this.http.get<PagedList<PrintSummary>>(url, { params, headers });
  }

  getPrintDetail(id: number): Observable<PrintDetail> {
    const url = `${this.baseApi}/api/Prints/${id}`;
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');

    return this.http
      .get<PrintDetailDTO>(url, { headers })
      .pipe(
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
        // mergeMap(print => {
        //   if (print.images.length === 0) {
        //     return of(print);
        //   }

        //   const imageRequests: Observable<string>[] = [];
        //   for (const image of print.images) {
        //     imageRequests.push(this.getPrintImage(print.id, image.id));
        //   }

        //   return forkJoin(imageRequests).pipe(
        //     tap(request => console.log(request)),
        //     map(images => {
        //       for (let i = 0; i < print.images.length; i++) {
        //         print.images[i].url = images[i];
        //       }
        //       return print;
        //     })
        //   );
        // })
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
          isEstimatedLengthSource: pf.isEstimatedLengthSource,
          amountMg: pf.amountMg,
          lengthInM: pf.lengthInM,
          isActualLengthSource: pf.isActualLengthSource,
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
}
