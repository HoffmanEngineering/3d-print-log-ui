import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import {
  currencyNameSettingResolver,
  currencySymbolSettingResolver,
  defaultElectricityKwhRateSettingResolver,
  defaultElectricityWattageSettingResolver,
  defaultFilamentDiameterSettingResolver,
  defaultFilamentPriceSettingResolver,
  defaultPrintViewStatusSettingResolver,
  preferredFilamentDisplayUnitSettingResolver,
} from '../core/resolvers/user-setting.resolvers';

import { currenciesResolver } from '../core/resolvers/currencies.resolver';
import { currentUserDetailResolver } from './resolvers/current-user-detail.resolver';
import { SettingsComponent } from './settings.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    resolve: {
      currentUser: currentUserDetailResolver,
      defaultPrintViewStatusSetting: defaultPrintViewStatusSettingResolver,
      currencies: currenciesResolver,
      preferredCurrencyNameSetting: currencyNameSettingResolver,
      preferredCurrencySymbolSetting: currencySymbolSettingResolver,
      defaultFilamentDiameterMmSetting: defaultFilamentDiameterSettingResolver,
      defaultFilamentPriceSetting: defaultFilamentPriceSettingResolver,
      defaultElectricityKwhRateSetting:
        defaultElectricityKwhRateSettingResolver,
      defaultElectricityWattageSetting:
        defaultElectricityWattageSettingResolver,
      preferredFilamentDisplayUnitSetting:
        preferredFilamentDisplayUnitSettingResolver,
    },
  },
];

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
    children: routes,
  },
];
