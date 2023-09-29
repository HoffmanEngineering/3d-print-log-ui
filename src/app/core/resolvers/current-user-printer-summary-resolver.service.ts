import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { PrinterService, PrinterSummary } from '../services/printer.service';

@Injectable({
  providedIn: 'root',
})
export class CurrentUserPrinterSummaryResolverService {
  constructor(private printerService: PrinterService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.printerService
      .getCurrentUserPrinterSummaries(1, 100, undefined, false)
      .pipe(map((pagedResult) => pagedResult.items));
  }
}
