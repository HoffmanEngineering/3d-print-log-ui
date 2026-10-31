import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';
import { FeedComponent } from './feed.component';

const routes: Routes = [{ path: '', component: FeedComponent }];

export const FEED_ROUTES: Routes = [
  {
    path: '',
    providers: provideSectionProviders(),
    children: routes,
  },
];
