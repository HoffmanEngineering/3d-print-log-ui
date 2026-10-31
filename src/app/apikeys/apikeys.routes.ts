import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';
import { ApikeysComponent } from './apikeys.component';

const routes: Routes = [{ path: '', component: ApikeysComponent }];

export const APIKEYS_ROUTES: Routes = [
  {
    path: '',
    providers: provideSectionProviders(),
    children: routes,
  },
];
