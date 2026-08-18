import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { CurrencySymbolResolverService } from '../core/resolvers/currency-symbol-resolver.service';
import { DefaultFilamentDiameterSettingResolverService } from '../core/resolvers/default-filament-diameter-setting-resolver.service';
import { DefaultFilamentPriceSettingResolverService } from '../core/resolvers/default-filament-price-setting-resolver.service';
import { FilamentDetailComponent } from './filament-detail/filament-detail.component';
import { FilamentListContainerComponent } from './filament-list-container/filament-list-container.component';
import { CopyFilamentDetailResolverService } from './resolvers/copy-filament-detail-resolver.service';

import { FilamentDetailResolverService } from './resolvers/filament-detail-resolver.service';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';
import { MaterialResolverService } from './resolvers/material-resolver.service';
import { MaterialCategoryResolverService } from '../core/resolvers/material-category-resolver.service';
import { PreferredFilamentDisplayUnitSettingResolverService } from '../core/resolvers/preferred-filament-display-unit-setting-resolver.service';
import { FilamentStorageLocationResolverService } from './resolvers/filament-storage-location-resolver.service';

export const filamentRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: FilamentListContainerComponent,
        canActivate: [AuthGuard],
        resolve: {
          filamentList: FilamentListResolverService,
          materialCategories: MaterialCategoryResolverService,
          storageLocations: FilamentStorageLocationResolverService,
        },
      },
      {
        path: 'copy/:id',
        component: FilamentDetailComponent,
        canActivate: [AuthGuard],
        resolve: {
          filament: CopyFilamentDetailResolverService,
          materials: MaterialResolverService,
          preferredCurrencySymbolSetting: CurrencySymbolResolverService,
          defaultFilamentDiameterMmSetting:
            DefaultFilamentDiameterSettingResolverService,
          defaultFilamentPriceSetting:
            DefaultFilamentPriceSettingResolverService,
          materialCategories: MaterialCategoryResolverService,
          preferredFilamentDisplayUnitSetting:
            PreferredFilamentDisplayUnitSettingResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: ':id',
        component: FilamentDetailComponent,
        canActivate: [AuthGuard],
        resolve: {
          filament: FilamentDetailResolverService,
          materials: MaterialResolverService,
          preferredCurrencySymbolSetting: CurrencySymbolResolverService,
          defaultFilamentDiameterMmSetting:
            DefaultFilamentDiameterSettingResolverService,
          defaultFilamentPriceSetting:
            DefaultFilamentPriceSettingResolverService,
          materialCategories: MaterialCategoryResolverService,
          preferredFilamentDisplayUnitSetting:
            PreferredFilamentDisplayUnitSettingResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(filamentRoutes)],
  exports: [RouterModule],
})
export class FilamentRoutingModule {}
