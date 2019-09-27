import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PrintService, PrintSummary } from '../services/print.service';

@Injectable()
export class PrintListResolverService implements Resolve<PrintSummary[]> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.printService.getPrintSummaries();
  }
  constructor(private printService: PrintService) {}
}
