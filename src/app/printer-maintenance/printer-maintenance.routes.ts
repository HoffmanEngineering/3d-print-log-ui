import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
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

export const PRINTER_MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
    children: routes,
  },
];
