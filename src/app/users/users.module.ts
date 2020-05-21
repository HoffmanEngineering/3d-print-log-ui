import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { UserDetailResolverService } from './resolvers/user-detail-resolver.service';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';

@NgModule({
  declarations: [UsersComponent, UserProfileComponent],
  imports: [SharedModule, UsersRoutingModule],
  providers: [UserDetailResolverService],
})
export class UsersModule {}
