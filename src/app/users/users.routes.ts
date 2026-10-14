import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';

import { InvalidUserComponent } from './invalid-user/invalid-user.component';
import { userDetailResolver } from './resolvers/user-detail.resolver';
import { UserAchievementsComponent } from './user-achievements/user-achievements.component';
import { UserProfileComponent } from './user-profile/user-profile.component';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
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
          userDetail: userDetailResolver,
        },
      },
    ],
  },
];
