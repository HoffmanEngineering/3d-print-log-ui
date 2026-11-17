import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';
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
    providers: provideSectionProviders(),
    children: routes,
  },
];
