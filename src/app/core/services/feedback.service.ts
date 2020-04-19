import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export enum FeedbackType {
  Question = 1,
  Bug = 2,
  Suggestion = 3,
  Other = 4,
}

export interface AddFeedback {
  type: FeedbackType;
  email: string;
  note: string;
}

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private http: HttpClient) {}

  // getCurrentUserPrinterSummaries(): Observable<PrinterSummary[]> {
  //   const url = `${this.baseApi}/api/Users/me/printers`;
  //   return this.http.get<PrinterSummary[]>(url);
  // }

  addFeedback(feedback: AddFeedback) {
    const url = `${this.baseApi}/api/Feedbacks`;
    return this.http.post<never>(url, feedback);
  }
}
