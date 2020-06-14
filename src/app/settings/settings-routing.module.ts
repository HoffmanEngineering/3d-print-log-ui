import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DefaultPrintViewStatusSettingResolverService } from '../core/resolvers/default-print-view-status-setting-resolver.service';
import { CurrentUserDetailResolverService } from './resolvers/current-user-detail-resolver.service';
import { SettingsComponent } from './settings.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    resolve: {
      currentUser: CurrentUserDetailResolverService,
      defaultPrintViewStatusSetting: DefaultPrintViewStatusSettingResolverService,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
