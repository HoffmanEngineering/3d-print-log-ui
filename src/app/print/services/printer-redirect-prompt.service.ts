import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrinterService } from 'src/app/core/services/printer.service';

@Injectable({
  providedIn: 'root',
})
export class PrinterRedirectPromptService {
  private printerService = inject(PrinterService);

  shouldShowAddPrinterPrompt(): Observable<boolean> {
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
