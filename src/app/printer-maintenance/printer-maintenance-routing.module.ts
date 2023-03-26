import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CurrencySymbolResolverService } from '../core/resolvers/currency-symbol-resolver.service';
import { PrinterMaintenanceComponent } from './printer-maintenance.component';
import { PrinterMaintenanceResolverService } from './resolvers/printer-maintenance-resolver.service';
import { CurrentUserPrinterSummaryResolverService } from '../core/resolvers/current-user-printer-summary-resolver.service';

const routes: Routes = [
  {
    path: '',
    component: PrinterMaintenanceComponent,
    resolve: {
      entries: PrinterMaintenanceResolverService,
      preferredCurrencySymbolSetting: CurrencySymbolResolverService,
      printers: CurrentUserPrinterSummaryResolverService,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrinterMaintenanceRoutingModule {}
