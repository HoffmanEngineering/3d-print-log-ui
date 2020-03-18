import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, fromEvent, Observable, of } from 'rxjs';
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

export enum PrintStatus {
  Pending,
  Printing,
  Success,
  Cancelled,
  Failed,
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

@Injectable()
export class PrintService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  getPrintSummaries(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedList<PrintSummary>> {
    const url = `${this.baseApi}/api/Prints/summary`;

    const params = new HttpParams()
      .set('PageNumber', pageNumber.toString(10))
      .set('PageSize', pageSize.toString(10));

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

  public uploadPrintImage(printId: number, file: File) {
    const url = `${this.baseApi}/api/Prints/${printId}/image`;

    const formData: FormData = new FormData();
    formData.append('image', file, file.name);

    return this.http.post(url, formData);
  }

  /**
   * Returns the print's image as a base64 encoded dataUrl
   */
  public getPrintImage(printId: number, imageId: number): Observable<string> {
    const url = `${this.baseApi}/api/Prints/${printId}/image/${imageId}`;

    console.log(url);

    return this.http.get(url, { responseType: 'blob' }).pipe(
      concatMap(image => {
        console.log({ image });
        const reader = new FileReader();
        reader.readAsDataURL(image);
        return fromEvent(reader, 'load');
      }),
      take(1),
      map(e => {
        // result includes identifier 'data:image/png;base64,' plus the base64 data
        const data = (e.target as FileReader).result as string;
        console.log({ data });
        return data;
      }),
      catchError(err => of(''))
    );
  }

  public setImageAsDefault(printId: number, imageId: number) {
    const url = `${this.baseApi}/api/Prints/${printId}/image/${imageId}/set-as-default`;

    return this.http.post(url, {});
  }
}
