import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { InvalidUserComponent } from './invalid-user/invalid-user.component';
import { UserDetailResolverService } from './resolvers/user-detail-resolver.service';
import { UserAchievementsComponent } from './user-achievements/user-achievements.component';
import { UserProfileComponent } from './user-profile/user-profile.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'not-found',
        component: InvalidUserComponent,
      },
      {
        // Public and resolver-free: it must render for a logged-out visitor, and the
        // component turns every failure into an empty state.
        path: ':id/achievements',
        component: UserAchievementsComponent,
      },
      {
        path: ':id',
        component: UserProfileComponent,
        resolve: {
          userDetail: UserDetailResolverService,
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsersRoutingModule {}
