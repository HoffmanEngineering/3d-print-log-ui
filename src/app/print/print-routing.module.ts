import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';

import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { CurrenciesResolverService } from '../core/resolvers/currencies-resolver.service';
import { CurrencyNameResolverService } from '../core/resolvers/currency-name-resolver.service';
import { CurrencySymbolResolverService } from '../core/resolvers/currency-symbol-resolver.service';
import { CurrentUserPrinterSummaryResolverService } from '../core/resolvers/current-user-printer-summary-resolver.service';
import { DefaultFilamentPriceSettingResolverService } from '../core/resolvers/default-filament-price-setting-resolver.service';
import { DefaultPrintViewStatusSettingResolverService } from '../core/resolvers/default-print-view-status-setting-resolver.service';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { LastFilamentMeasureSettingResolverService } from './resolvers/last-filament-measure-setting-resolver.service';
import { LastSelectedPrinterSettingResolverService } from './resolvers/last-selected-printer-setting-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: PrintListComponent,
        resolve: {
          printList: PrintListResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
          filaments: FilamentListResolverService,
          preferredCurrencySymbolSetting: CurrencySymbolResolverService,
          defaultFilamentPriceSetting:
            DefaultFilamentPriceSettingResolverService,
        },
      },
      {
        path: 'copy/:id',
        component: EditPrintDetailComponent,
        resolve: {
          print: CopyPrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
          lastSelectedPrintSetting: LastSelectedPrinterSettingResolverService,
          defaultPrintViewStatusSetting:
            DefaultPrintViewStatusSettingResolverService,
          defaultFilamentPriceSetting:
            DefaultFilamentPriceSettingResolverService,
          lastFilamentMeasureSettings:
            LastFilamentMeasureSettingResolverService,
          currencies: CurrenciesResolverService,
          preferredCurrencyNameSetting: CurrencyNameResolverService,
          preferredCurrencySymbolSetting: CurrencySymbolResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: ':id/edit',
        component: EditPrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
          lastSelectedPrintSetting: LastSelectedPrinterSettingResolverService,
          defaultPrintViewStatusSetting:
            DefaultPrintViewStatusSettingResolverService,
          defaultFilamentPriceSetting:
            DefaultFilamentPriceSettingResolverService,
          lastMaterialMeasureSettings:
            LastFilamentMeasureSettingResolverService,
          currencies: CurrenciesResolverService,
          preferredCurrencyNameSetting: CurrencyNameResolverService,
          preferredCurrencySymbolSetting: CurrencySymbolResolverService,
        },
        canActivate: [AuthGuard],
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: 'new/cura',

        redirectTo: 'new/edit',
      },
      {
        path: ':id',
        component: ViewPrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
        },
      },
    ],
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class PrintRoutingModule {}
