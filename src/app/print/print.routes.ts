import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { CuraParserService } from './services/integration/cura-parser.service';
import { CuraParserV1pt0pt0Service } from './services/integration/cura/cura-parser-v1-0-0.service';
import { CuraParserV1pt1pt0Service } from './services/integration/cura/cura-parser-v1-1-0.service';
import { CuraParserV1pt2pt0Service } from './services/integration/cura/cura-parser-v1-2-0.service';
import { authGuard } from '../core/guards/auth.guard';

import { welcomeRedirectGuard } from '../onboarding/welcome-redirect.guard';
import { pendingChangesGuard } from '../core/guards/pending-changes.guard';
import { currenciesResolver } from '../core/resolvers/currencies.resolver';
import {
  currencyNameSettingResolver,
  currencySymbolSettingResolver,
  defaultElectricityKwhRateSettingResolver,
  defaultElectricityWattageSettingResolver,
  defaultFilamentPriceSettingResolver,
  defaultPrintViewStatusSettingResolver,
  lastSelectedPrinterSettingResolver,
} from '../core/resolvers/user-setting.resolvers';
import { currentUserPrinterSummariesResolver } from '../core/resolvers/current-user-printer-summaries.resolver';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { copyPrintDetailResolver } from './resolvers/copy-print-detail.resolver';
import { lastFilamentMeasureSettingResolver } from './resolvers/last-filament-measure-setting.resolver';
import { printDetailResolver } from './resolvers/print-detail.resolver';
import { printListResolver } from './resolvers/print-list.resolver';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';
import { filamentFilterResolver } from './resolvers/filament-filter.resolver';

export const PRINT_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [
      importProvidersFrom(SharedModule),
      CuraParserService,
      CuraParserV1pt0pt0Service,
      CuraParserV1pt1pt0Service,
      CuraParserV1pt2pt0Service,
    ],
    children: [
      {
        path: '',
        component: PrintListComponent,
        canActivate: [authGuard, welcomeRedirectGuard],
        resolve: {
          printList: printListResolver,
          printers: currentUserPrinterSummariesResolver,
          filaments: filamentFilterResolver,
          preferredCurrencySymbolSetting: currencySymbolSettingResolver,
          defaultFilamentPriceSetting: defaultFilamentPriceSettingResolver,
          defaultElectricityKwhRateSetting:
            defaultElectricityKwhRateSettingResolver,
          defaultElectricityWattageSetting:
            defaultElectricityWattageSettingResolver,
        },
      },
      {
        path: 'copy/:id',
        component: EditPrintDetailComponent,
        canActivate: [authGuard],
        resolve: {
          print: copyPrintDetailResolver,
          printers: currentUserPrinterSummariesResolver,
          lastSelectedPrintSetting: lastSelectedPrinterSettingResolver,
          defaultPrintViewStatusSetting: defaultPrintViewStatusSettingResolver,
          defaultFilamentPriceSetting: defaultFilamentPriceSettingResolver,
          lastFilamentMeasureSettings: lastFilamentMeasureSettingResolver,
          currencies: currenciesResolver,
          preferredCurrencyNameSetting: currencyNameSettingResolver,
          preferredCurrencySymbolSetting: currencySymbolSettingResolver,
          defaultElectricityKwhRateSetting:
            defaultElectricityKwhRateSettingResolver,
          defaultElectricityWattageSetting:
            defaultElectricityWattageSettingResolver,
        },
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: ':id/edit',
        component: EditPrintDetailComponent,
        resolve: {
          print: printDetailResolver,
          printers: currentUserPrinterSummariesResolver,
          lastSelectedPrintSetting: lastSelectedPrinterSettingResolver,
          defaultPrintViewStatusSetting: defaultPrintViewStatusSettingResolver,
          defaultFilamentPriceSetting: defaultFilamentPriceSettingResolver,
          lastMaterialMeasureSettings: lastFilamentMeasureSettingResolver,
          currencies: currenciesResolver,
          preferredCurrencyNameSetting: currencyNameSettingResolver,
          preferredCurrencySymbolSetting: currencySymbolSettingResolver,
          defaultElectricityKwhRateSetting:
            defaultElectricityKwhRateSettingResolver,
          defaultElectricityWattageSetting:
            defaultElectricityWattageSettingResolver,
        },
        canActivate: [authGuard],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'new/cura',

        redirectTo: 'new/edit',
      },
      {
        // Deliberately resolves NOTHING. A resolver keeps the previous page on
        // screen until it settles, so this public, frequently deep-linked route
        // looked like a dead click on a slow connection. ViewPrintDetailComponent
        // loads the print and its settings itself and paints a skeleton in the
        // meantime. It also means there is no longer anything on this route that
        // can reject and bounce a logged-out visitor to / (#66).
        path: ':id',
        component: ViewPrintDetailComponent,
      },
    ],
  },
];
