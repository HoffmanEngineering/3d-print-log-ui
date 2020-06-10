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

export interface PrintSummary {
  id: number;
  title: string;
  printer: PrinterSummary;
  startDate?: Date;
  status: PrintStatus;

  defaultPrintImageId: number;
  createdByUserId: number;
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
  filamentUsageMg?: number;
  filamentType: string;
  notes: string;
  url: string;
  status: PrintStatus;
  viewStatus: PrintViewStatus;
  images?: PrintImage[];
  createdByUserId: number;
}

export interface PutPrintDetailDTO {
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

  viewStatus: PrintViewStatus;
  images?: PrintImage[];
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
  notes: string;
  url: string;
  status: PrintStatus;

  viewStatus: PrintViewStatus;

  images?: PrintImage[];
  createdByUserId: number;
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
  notes: string;
  url: string;
  status: PrintStatus;

  viewStatus: PrintViewStatus;
}

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
            viewStatus: newPrint.viewStatus,
            images: newPrint.images || [],
            createdByUserId: newPrint.createdByUserId,
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
      viewStatus: newPrint.viewStatus,
    };

    return this.http.post<any>(url, printDto);
  }

  updatePrint(print: PrintDetail): Observable<any> {
    const url = `${this.baseApi}/api/Prints/${print.id}`;

    const printer: any = {
      id: print.printerId,
    };

    const printDto: PutPrintDetailDTO = {
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
      images: print.images,
      viewStatus: print.viewStatus,
    };

    return this.http.put<any>(url, printDto);
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
}
