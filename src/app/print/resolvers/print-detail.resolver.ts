import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import { PrintDetail } from '../../core/services/print.service';
import { CuraParserService } from '../services/integration/cura-parser.service';
import {
  PrintDetailLoaderService,
  PrintDetailWithUser,
} from '../services/print-detail-loader.service';

/** The resolved print, plus the names a slicer file gave its printer, for the form's detection. */
export interface PrintDetailForEdit extends PrintDetailWithUser {
  detectedPrinterNames?: string[];
}

/**
 * Still used by `/prints/:id/edit`, which needs the print before the editor's
 * form can be built. The public view route no longer resolves anything and
 * fetches through `PrintDetailLoaderService` directly, so it can paint a
 * skeleton immediately.
 */
export const printDetailResolver: ResolveFn<PrintDetailForEdit> = (route) => {
  const printId = +route.paramMap.get('id');

  if (Number.isInteger(printId)) {
    // Never rejects — see PrintDetailLoaderService.
    return inject(PrintDetailLoaderService).load(printId);
  }

  let defaultPrint: PrintDetail | null = null;
  let detectedPrinterNames: string[] = [];

  // Check if there is a new print in the store. If so, use that:
  const newPrintStore = inject(NewPrintStoreService);
  if (newPrintStore.hasNewPrint()) {
    defaultPrint = newPrintStore.getNewPrint();
    detectedPrinterNames = newPrintStore.getNewPrintMeta().detectedPrinterNames;
    newPrintStore.clear();
  }

  if (sentFromCura(route)) {
    return inject(CuraParserService)
      .parse(route.queryParamMap)
      .then((print) => {
        const curaPrintDetail: PrintDetailWithUser = {
          print,
          user: null,
        };

        return curaPrintDetail;
      });
  }

  const emptyPrintDetail: PrintDetailForEdit = {
    print: defaultPrint,
    user: null,
    detectedPrinterNames,
  };

  return emptyPrintDetail;
};

function sentFromCura(route: ActivatedRouteSnapshot): boolean {
  return (
    route.queryParamMap.has('cura_version') &&
    route.queryParamMap.has('plugin_version')
  );
}
