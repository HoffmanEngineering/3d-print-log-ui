import { AchievementStripComponent } from './achievement-strip/achievement-strip.component';
import { NgModule } from '@angular/core';

import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';
import { InvalidUserComponent } from './invalid-user/invalid-user.component';
import { StatsComponent } from './stats/stats.component';
import { UserPrintsComponent } from './user-prints/user-prints.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { UsersRoutingModule } from './users-routing.module';

@NgModule({
  imports: [
    SharedModule,
    UsersRoutingModule,
    AdsenseModule,
    AchievementStripComponent,
    UserProfileComponent,
    UserPrintsComponent,
    StatsComponent,
    InvalidUserComponent,
  ],
})
export class UsersModule {}
