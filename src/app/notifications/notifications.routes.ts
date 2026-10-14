import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { NotificationsListComponent } from './notifications-list/notifications-list.component';

const routes: Routes = [
  {
    path: '',
    component: NotificationsListComponent,
  },
];

export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
    children: routes,
  },
];
