import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CurrencyNameResolverService } from '../core/resolvers/currency-name-resolver.service';
import { CurrencySymbolResolverService } from '../core/resolvers/currency-symbol-resolver.service';

import { DefaultPrintViewStatusSettingResolverService } from '../core/resolvers/default-print-view-status-setting-resolver.service';
import { CurrenciesResolverService } from '../core/resolvers/currencies-resolver.service';
import { CurrentUserDetailResolverService } from './resolvers/current-user-detail-resolver.service';
import { SettingsComponent } from './settings.component';
import { DefaultFilamentDiameterSettingResolverService } from '../core/resolvers/default-filament-diameter-setting-resolver.service';
import { DefaultFilamentPriceSettingResolverService } from '../core/resolvers/default-filament-price-setting-resolver.service';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    resolve: {
      currentUser: CurrentUserDetailResolverService,
      defaultPrintViewStatusSetting:
        DefaultPrintViewStatusSettingResolverService,
      currencies: CurrenciesResolverService,
      preferredCurrencyNameSetting: CurrencyNameResolverService,
      preferredCurrencySymbolSetting: CurrencySymbolResolverService,
      defaultFilamentDiameterMmSetting:
        DefaultFilamentDiameterSettingResolverService,
      defaultFilamentPriceSetting: DefaultFilamentPriceSettingResolverService,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
