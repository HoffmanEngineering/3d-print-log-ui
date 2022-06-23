import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { CurrenciesResolverService } from './resolvers/currencies-resolver.service';
import { CurrentUserDetailResolverService } from './resolvers/current-user-detail-resolver.service';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';

@NgModule({
  declarations: [SettingsComponent],
  imports: [SharedModule, SettingsRoutingModule],
  providers: [CurrentUserDetailResolverService, CurrenciesResolverService],
})
export class SettingsModule {}
