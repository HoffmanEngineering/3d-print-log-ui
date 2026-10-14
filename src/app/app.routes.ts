import { EnvironmentProviders } from '@angular/core';
import {
  provideRouter,
  Routes,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';
import { environment } from 'src/environments/environment';
import { authGuard } from './core/guards/auth.guard';
import { homepageRedirectGuard } from './core/guards/homepage-redirect.guard';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';
import { SelectivePreloadStrategy } from './core/routing/selective-preload.strategy';
import { HomeComponent } from './home/home.component';
import { SlicerLandingComponent } from './slicer/slicer-landing.component';
import { KlipperLandingComponent } from './klipper/klipper-landing.component';

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
    canActivate: [authGuard],
  },
  {
    path: 'prints',
    loadChildren: () =>
      import('./print/print.routes').then((m) => m.PRINT_ROUTES),
    data: { preload: true },
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('./project/project.routes').then((m) => m.PROJECT_ROUTES),
  },
  {
    path: 'printers',
    loadChildren: () =>
      import('./printer/printer.routes').then((m) => m.PRINTER_ROUTES),
    data: { preload: true },
  },
  {
    path: 'printer-maintenance',
    loadChildren: () =>
      import('./printer-maintenance/printer-maintenance.routes').then(
        (m) => m.PRINTER_MAINTENANCE_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    // Public: unsubscribe and manage links from emails land here. The token is the credential.
    path: 'email-preferences',
    loadComponent: () =>
      import('./email-preferences/email-preferences.component').then(
        (m) => m.EmailPreferencesComponent
      ),
  },
  {
    path: 'feedback',
    loadComponent: () =>
      import('./shared/feedback/feedback.component').then(
        (m) => m.FeedbackComponent
      ),
    canActivate: [authGuard],
    canDeactivate: [pendingChangesGuard],
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
      import('./analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES),
    canActivate: [authGuard],
  },
  environment.features.userProfile
    ? {
        path: 'users',
        loadChildren: () =>
          import('./users/users.routes').then((m) => m.USERS_ROUTES),
      }
    : { path: 'users', redirectTo: '/home-redirect' },
  {
    path: 'settings',
    loadChildren: () =>
      import('./settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: 'filament',
    redirectTo: 'materials',
  },
  {
    path: 'materials',
    loadChildren: () =>
      import('./filament/filament.routes').then((m) => m.FILAMENT_ROUTES),
    data: { preload: true },
  },
  {
    path: 'api-keys',
    loadChildren: () =>
      import('./apikeys/apikeys.routes').then((m) => m.APIKEYS_ROUTES),
    canActivate: [authGuard],
  },
  {
    // Not preloaded: most visits to the app never open the collection.
    path: 'achievements',
    loadChildren: () =>
      import('./achievements/achievements.routes').then(
        (m) => m.ACHIEVEMENTS_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: 'notifications',
    loadChildren: () =>
      import('./notifications/notifications.routes').then(
        (m) => m.NOTIFICATIONS_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: 'subscription',
    loadChildren: () =>
      import('./subscription/subscription.routes').then(
        (m) => m.SUBSCRIPTION_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: 'home-redirect',
    canActivate: [homepageRedirectGuard],
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
    path: 'klipper',
    component: KlipperLandingComponent,
  },
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'feed',
    loadChildren: () => import('./feed/feed.routes').then((m) => m.FEED_ROUTES),
    canActivate: [authGuard],
  },

  {
    // Reached only under a known segment (e.g. /prints/1/nope): Static Web Apps
    // serves a real 404 for unknown top-level paths before the app ever loads.
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];

/** The router as the app runs it; `routes` is only for tests. */
export function provideAppRouter(
  routes: Routes = appRoutes
): EnvironmentProviders {
  return provideRouter(
    routes,
    withInMemoryScrolling({
      scrollPositionRestoration: 'enabled',
      // Without this, scrollPositionRestoration scrolls a fragment navigation
      // back to the top: the router does not look at the `#anchor` at all, so
      // every deep link into a docs page landed at the top of it. The two
      // settings are designed to work together — with anchorScrolling on, a
      // navigation carrying a fragment scrolls to that element instead of
      // being restored.
      anchorScrolling: 'enabled',
    }),
    withPreloading(SelectivePreloadStrategy)
  );
}
