import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrinterService } from 'src/app/core/services/printer.service';

@Injectable({
  providedIn: 'root',
})
export class PrinterRedirectPromptService {
  /**
   * We only want to show the prompt once per login.
   */
  private hasShownPromptBefore = false;

  constructor(private printerService: PrinterService) {}

  shouldShowAddPrinterPrompt(): Observable<boolean> {
    if (this.hasShownPromptBefore) {
      return of(false);
    }

    return this.printerService
      .getCurrentUserPrinterSummaries(1, 100, undefined, false)
      .pipe(
        map((results) => {
          const hasPrinters = results.paging.totalCount > 0;
          const shouldShowPrompt = !hasPrinters;

          return shouldShowPrompt;
        })
      );
  }
}
