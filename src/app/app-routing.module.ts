import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { HomepageRedirectGuard } from './core/guards/homepage-redirect.guard';
import { PendingChangesGuard } from './core/guards/pending-changes.guard';
import { CallbackComponent } from './shared/callback/callback.component';
import { FeedbackComponent } from './shared/feedback/feedback.component';
import { UserProfileComponent } from './shared/user-profile/user-profile.component';

const routes: Routes = [
  {
    path: 'callback',
    component: CallbackComponent,
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'prints',
    loadChildren: () =>
      import('./print/print.module').then((m) => m.PrintModule),
  },
  {
    path: 'printers',
    loadChildren: () =>
      import('./printer/printer.module').then((m) => m.PrinterModule),
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'feedback',
    component: FeedbackComponent,
    canActivate: [AuthGuard],
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: 'docs',
    loadChildren: () =>
      import('./documentation/documentation.module').then(
        (m) => m.DocumentationModule
      ),
  },
  {
    path: 'analytics',
    loadChildren: () =>
      import('./analytics/analytics.module').then((m) => m.AnalyticsModule),
  },
  {
    path: 'users',
    loadChildren: () =>
      import('./users/users.module').then((m) => m.UsersModule),
  },
  {
    path: 'home-redirect',
    canActivate: [HomepageRedirectGuard],
    pathMatch: 'full',
    children: [],
  },
  {
    path: '',
    redirectTo: '/home-redirect',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: '/home-redirect',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
