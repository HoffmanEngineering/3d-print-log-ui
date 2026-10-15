import { Routes } from '@angular/router';
import { AnalyticsShellComponent } from './analytics-shell.component';

/**
 * Analytics is authenticated-only. authGuard stays on the parent route in
 * app.routes.ts — this must never become a public route.
 */
export const ANALYTICS_ROUTES: Routes = [
  { path: '', component: AnalyticsShellComponent },
];
