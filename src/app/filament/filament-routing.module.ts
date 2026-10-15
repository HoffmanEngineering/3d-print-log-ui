import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { pendingChangesGuard } from '../core/guards/pending-changes.guard';
import {
  currencySymbolSettingResolver,
  defaultFilamentDiameterSettingResolver,
  defaultFilamentPriceSettingResolver,
  filamentDisplayUnitSettingResolver,
} from '../core/resolvers/user-setting.resolvers';
import { FilamentDetailComponent } from './filament-detail/filament-detail.component';
import { FilamentListContainerComponent } from './filament-list-container/filament-list-container.component';
import { copyFilamentDetailResolver } from './resolvers/copy-filament-detail.resolver';

import { filamentDetailResolver } from './resolvers/filament-detail.resolver';
import { filamentListResolver } from './resolvers/filament-list.resolver';
import { materialsResolver } from './resolvers/materials.resolver';
import { materialCategoriesResolver } from '../core/resolvers/material-categories.resolver';
import { filamentStorageLocationsResolver } from './resolvers/filament-storage-locations.resolver';
import { spoolNumberRedirectGuard } from './spool-number-redirect.guard';

export const filamentRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: FilamentListContainerComponent,
        canActivate: [authGuard],
        resolve: {
          filamentList: filamentListResolver,
          materialCategories: materialCategoriesResolver,
          storageLocations: filamentStorageLocationsResolver,
        },
      },
      {
        path: 'copy/:id',
        component: FilamentDetailComponent,
        canActivate: [authGuard],
        resolve: {
          filament: copyFilamentDetailResolver,
          materials: materialsResolver,
          preferredCurrencySymbolSetting: currencySymbolSettingResolver,
          defaultFilamentDiameterMmSetting:
            defaultFilamentDiameterSettingResolver,
          defaultFilamentPriceSetting: defaultFilamentPriceSettingResolver,
          materialCategories: materialCategoriesResolver,
          preferredFilamentDisplayUnitSetting:
            filamentDisplayUnitSettingResolver,
        },
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'spool/:number',
        canActivate: [AuthGuard, spoolNumberRedirectGuard],
        children: [],
      },
      {
        path: ':id',
        component: FilamentDetailComponent,
        canActivate: [authGuard],
        resolve: {
          filament: filamentDetailResolver,
          materials: materialsResolver,
          preferredCurrencySymbolSetting: currencySymbolSettingResolver,
          defaultFilamentDiameterMmSetting:
            defaultFilamentDiameterSettingResolver,
          defaultFilamentPriceSetting: defaultFilamentPriceSettingResolver,
          materialCategories: materialCategoriesResolver,
          preferredFilamentDisplayUnitSetting:
            filamentDisplayUnitSettingResolver,
        },
        canDeactivate: [pendingChangesGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(filamentRoutes)],
  exports: [RouterModule],
})
export class FilamentRoutingModule {}
