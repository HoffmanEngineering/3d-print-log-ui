import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { currencySymbolSettingResolver } from '../core/resolvers/user-setting.resolvers';
import { PrinterMaintenanceComponent } from './printer-maintenance.component';
import { printerMaintenanceListResolver } from './resolvers/printer-maintenance-list.resolver';
import { currentUserPrinterSummariesResolver } from '../core/resolvers/current-user-printer-summaries.resolver';

const routes: Routes = [
  {
    path: '',
    component: PrinterMaintenanceComponent,
    resolve: {
      entries: printerMaintenanceListResolver,
      preferredCurrencySymbolSetting: currencySymbolSettingResolver,
      printers: currentUserPrinterSummariesResolver,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrinterMaintenanceRoutingModule {}
