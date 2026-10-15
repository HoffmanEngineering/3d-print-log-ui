import { AchievementSettingsComponent } from './achievement-settings/achievement-settings.component';
import { EmailSettingsComponent } from './email-settings/email-settings.component';
import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { ConnectedAgentsComponent } from './connected-agents/connected-agents.component';
import { SpoolmanConnectionsComponent } from './spoolman-connections/spoolman-connections.component';

@NgModule({
  imports: [
    SharedModule,
    SettingsRoutingModule,
    ConnectedAgentsComponent,
    SpoolmanConnectionsComponent,
    AchievementSettingsComponent,
    EmailSettingsComponent,
    SettingsComponent,
  ],
})
export class SettingsModule {}
