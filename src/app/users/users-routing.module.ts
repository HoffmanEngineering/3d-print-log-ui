import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { InvalidUserComponent } from './invalid-user/invalid-user.component';
import { UserDetailResolverService } from './resolvers/user-detail-resolver.service';
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
