import { Routes } from '@angular/router';
import { AnalyticsShellComponent } from './analytics-shell.component';

/**
 * Analytics is authenticated-only. AuthGuard stays on the parent route in
 * app-routing.module.ts — this must never become a public route.
 */
export const ANALYTICS_ROUTES: Routes = [
  { path: '', component: AnalyticsShellComponent },
];
