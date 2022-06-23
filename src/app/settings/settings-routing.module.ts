import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CurrencyNameResolverService } from '../core/resolvers/currency-name-resolver.service';
import { CurrencySymbolResolverService } from '../core/resolvers/currency-symbol-resolver.service';

import { DefaultPrintViewStatusSettingResolverService } from '../core/resolvers/default-print-view-status-setting-resolver.service';
import { CurrenciesResolverService } from './resolvers/currencies-resolver.service';
import { CurrentUserDetailResolverService } from './resolvers/current-user-detail-resolver.service';
import { SettingsComponent } from './settings.component';

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
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
