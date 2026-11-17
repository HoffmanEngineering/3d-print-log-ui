import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PrintStatus } from './print.service';
import { UserSummaryDto } from './user.service';

export interface PrinterFeedSummary {
  id: number;
  name: string;
  make: string;
  model: string;
  isActive: boolean;
}

export interface PrintFeedSummary {
  id: number;
  title: string;
  printer: PrinterFeedSummary;

  createdBy: UserSummaryDto;
  startDate?: Date;
  createdDate: Date;
  status: PrintStatus;

  defaultPrintImageId: number;
  /** Thumbnail path relative to the API base URL; absent from APIs older than #281. */
  defaultPrintImageThumbnailUrl?: string | null;
  createdByUserId: number;
  estimatedPrintTimeInSeconds: number | null;
  printTimeInSeconds: number | null;

  /**
   * The number of comments on the print.
   */
  commentCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class FeedService {
  private readonly http = inject(HttpClient);

  private readonly baseApi = environment.printLogApiUrl;

  public GetFeed(fromDateTime: Date) {
    const url = `${this.baseApi}/api/Feed`;

    const params = new HttpParams().set(
      'fromDateTime',
      fromDateTime.toISOString()
    );

    return this.http
      .get<PrintFeedSummary[]>(url, {
        params,
      })
      .pipe(
        map((results) => {
          const mappedResult: PrintFeedSummary[] = [];
          for (const print of results) {
            mappedResult.push({
              ...print,
              createdDate: new Date(print.createdDate),
            });
          }

          return mappedResult;
        })
      );
  }
}
