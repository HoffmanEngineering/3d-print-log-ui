import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { PrintService, PrintSummary } from '../../core/services/print.service';

@Injectable()
export class PrintListResolverService
  implements Resolve<PagedList<PrintSummary>> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.printService.getPrintSummaries();
  }
  constructor(private printService: PrintService) {}
}
