import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, from, fromEvent, Observable, of } from 'rxjs';
import {
  catchError,
  concatMap,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { environment } from 'src/environments/environment';

import * as moment from 'moment';

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
  images?: PrintImage[];
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

  images?: PrintImage[];
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

interface IResizeImageOptions {
  maxSize: number;
  file: File;
}

@Injectable()
export class PrintService {
  private readonly baseApi = environment.printLogApiUrl;

  private readonly IMAGE_QUALITY = 0.9;
  private readonly IMAGE_MAX_SIZE_PX = 1280;

  constructor(private http: HttpClient) {}

  getPrintSummaries(
    pageNumber: number = 1,
    pageSize: number = 10,
    searchText: string = '',
    filterByStatus: PrintStatus | null = null,
    sortDirection = SortDirection.Desc,
    sortColumn = PrintSummarySortColumn.StartDate
  ): Observable<PagedList<PrintSummary>> {
    const url = `${this.baseApi}/api/Prints/summary`;

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

    return this.http.get<PagedList<PrintSummary>>(url, { params });
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
          startDate: newPrint.startDate
            ? moment(newPrint.startDate).toDate()
            : null,
          status: newPrint.status,
          title: newPrint.title,
          url: newPrint.url,
          images: newPrint.images || [],
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
      images: print.images,
    };

    return this.http.put<any>(url, printDto);
  }

  public uploadPrintImage(printId: number, file: File, isDefault = false) {
    const url = `${this.baseApi}/api/Prints/${printId}/image`;

    const settings: IResizeImageOptions = {
      file,
      maxSize: this.IMAGE_MAX_SIZE_PX,
    };

    return from(this.resizeImage(settings)).pipe(
      switchMap(reducedImage => {
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

    return this.http.get(url, { responseType: 'blob' }).pipe(
      concatMap(image => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        return fromEvent(reader, 'load');
      }),
      take(1),
      map(e => {
        // result includes identifier 'data:image/png;base64,' plus the base64 data
        const data = (e.target as FileReader).result as string;

        return data;
      }),
      catchError(err => of(''))
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

  resizeImage = (settings: IResizeImageOptions): Promise<Blob> => {
    const file = settings.file;
    const maxSize = settings.maxSize;
    const reader = new FileReader();
    const image = new Image();
    const canvas = document.createElement('canvas');
    const dataURItoBlob = (dataURI: string) => {
      const bytes =
        dataURI.split(',')[0].indexOf('base64') >= 0
          ? atob(dataURI.split(',')[1])
          : unescape(dataURI.split(',')[1]);
      const mime = dataURI
        .split(',')[0]
        .split(':')[1]
        .split(';')[0];
      const max = bytes.length;
      const ia = new Uint8Array(max);
      for (let i = 0; i < max; i++) {
        ia[i] = bytes.charCodeAt(i);
      }
      return new Blob([ia], { type: mime });
    };
    const resize = () => {
      let width = image.width;
      let height = image.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', this.IMAGE_QUALITY);
      return dataURItoBlob(dataUrl);
    };

    return new Promise((ok, no) => {
      if (!file.type.match(/image.*/)) {
        no(new Error('Not an image'));
        return;
      }

      reader.onload = (readerEvent: any) => {
        image.onload = () => ok(resize());
        image.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  };
}
