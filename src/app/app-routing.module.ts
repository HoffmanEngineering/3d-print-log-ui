import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthGuard } from './core/guards/auth.guard';
import { HomepageRedirectGuard } from './core/guards/homepage-redirect.guard';
import { PendingChangesGuard } from './core/guards/pending-changes.guard';
import { HomeComponent } from './home/home.component';
import { SlicerLandingComponent } from './slicer/slicer-landing.component';

export const appRoutes: Routes = [
  {
    path: 'callback',
    loadComponent: () =>
      import('./shared/callback/callback.component').then(
        (m) => m.CallbackComponent
      ),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./shared/user-profile/user-profile.component').then(
        (m) => m.UserProfileComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'prints',
    loadChildren: () =>
      import('./print/print.module').then((m) => m.PrintModule),
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('./project/project.module').then((m) => m.ProjectModule),
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
    canActivate: [AuthGuard],
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'feedback',
    loadComponent: () =>
      import('./shared/feedback/feedback.component').then(
        (m) => m.FeedbackComponent
      ),
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
    canActivate: [AuthGuard],
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
    canActivate: [AuthGuard],
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
    canActivate: [AuthGuard],
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
    path: 'subscription',
    loadChildren: () =>
      import('./subscription/subscription.module').then(
        (m) => m.SubscriptionModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'home-redirect',
    canActivate: [HomepageRedirectGuard],
    pathMatch: 'full',
    children: [],
  },
  // Slicer landing pages (prerendered marketing routes).
  {
    path: 'cura',
    component: SlicerLandingComponent,
    data: { slicerKey: 'cura' },
  },
  {
    path: 'prusaslicer',
    component: SlicerLandingComponent,
    data: { slicerKey: 'prusaslicer' },
  },
  {
    path: 'bambu-studio',
    component: SlicerLandingComponent,
    data: { slicerKey: 'bambu-studio' },
  },
  {
    path: 'creality-print',
    component: SlicerLandingComponent,
    data: { slicerKey: 'creality-print' },
  },
  {
    path: 'orcaslicer',
    component: SlicerLandingComponent,
    data: { slicerKey: 'orcaslicer' },
  },
  {
    path: 'snapmaker-orca',
    component: SlicerLandingComponent,
    data: { slicerKey: 'snapmaker-orca' },
  },
  {
    path: 'anycubic-slicer',
    component: SlicerLandingComponent,
    data: { slicerKey: 'anycubic-slicer' },
  },
  {
    path: 'elegoo-slicer',
    component: SlicerLandingComponent,
    data: { slicerKey: 'elegoo-slicer' },
  },
  {
    path: 'qidi-studio',
    component: SlicerLandingComponent,
    data: { slicerKey: 'qidi-studio' },
  },
  {
    path: 'orca-flashforge',
    component: SlicerLandingComponent,
    data: { slicerKey: 'orca-flashforge' },
  },
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'feed',
    loadChildren: () => import('./feed/feed.module').then((m) => m.FeedModule),
    canActivate: [AuthGuard],
  },

  {
    path: '**',
    redirectTo: '/home-redirect',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, {
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
