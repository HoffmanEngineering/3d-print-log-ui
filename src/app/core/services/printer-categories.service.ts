import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { MaterialCategory } from './material-categories.service';

export interface PrinterCategory {
  nickname: string;
  name: string;
  description: string;
  materialCategory: MaterialCategory;
}

@Injectable({
  providedIn: 'root',
})
export class PrinterCategoryService {
  private readonly baseApi = environment.printLogApiUrl;
  private cachedPrinterCategories: PrinterCategory[] = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Cached endpoint to get the list of printer categories
   */
  public getPrinterCategories(): Observable<PrinterCategory[]> {
    if (this.cachedPrinterCategories) {
      return of(this.cachedPrinterCategories);
    }

    const url = `${this.baseApi}/api/PrinterCategories`;
    return this.http.get<PrinterCategory[]>(url).pipe(
      tap((materials) => {
        this.cachedPrinterCategories = materials;
      })
    );
  }
}
