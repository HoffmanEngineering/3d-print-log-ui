import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthGuard } from './core/guards/auth.guard';
import { HomepageRedirectGuard } from './core/guards/homepage-redirect.guard';
import { PendingChangesGuard } from './core/guards/pending-changes.guard';
import { HomeComponent } from './home/home.component';
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
    path: 'printer-maintenance',
    loadChildren: () =>
      import('./printer-maintenance/printer-maintenance.module').then(
        (m) => m.PrinterMaintenanceModule
      ),
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
  environment.features.userProfile
    ? {
        path: 'users',
        loadChildren: () =>
          import('./users/users.module').then((m) => m.UsersModule),
      }
    : { path: 'users', redirectTo: '/home-redirect' },
  {
    path: 'settings',
    loadChildren: () =>
      import('./settings/settings.module').then((m) => m.SettingsModule),
  },
  {
    path: 'filament',
    redirectTo: 'materials',
  },
  {
    path: 'materials',
    loadChildren: () =>
      import('./filament/filament.module').then((m) => m.FilamentModule),
  },
  {
    path: 'api-keys',
    loadChildren: () =>
      import('./apikeys/apikeys.module').then((m) => m.ApikeysModule),
  },
  {
    path: 'notifications',
    loadChildren: () =>
      import('./notifications/notifications.module').then(
        (m) => m.NotificationsModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'home-redirect',
    canActivate: [HomepageRedirectGuard],
    pathMatch: 'full',
    children: [],
  },
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'feed',
    loadChildren: () => import('./feed/feed.module').then((m) => m.FeedModule),
  },

  {
    path: '**',
    redirectTo: '/home-redirect',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
