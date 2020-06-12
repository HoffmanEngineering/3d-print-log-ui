import { NgModule } from '@angular/core';

import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';
import { UserDetailResolverService } from './resolvers/user-detail-resolver.service';
import { StatsComponent } from './stats/stats.component';
import { UserPrintsComponent } from './user-prints/user-prints.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';

@NgModule({
  declarations: [
    UsersComponent,
    UserProfileComponent,
    UserPrintsComponent,
    StatsComponent,
  ],
  imports: [SharedModule, UsersRoutingModule, AdsenseModule],
  providers: [UserDetailResolverService],
})
export class UsersModule {}
