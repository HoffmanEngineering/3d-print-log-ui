import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
