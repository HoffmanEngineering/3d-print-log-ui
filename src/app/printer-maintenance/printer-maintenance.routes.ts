import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';
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
    providers: provideSectionProviders(),
    children: routes,
  },
];
