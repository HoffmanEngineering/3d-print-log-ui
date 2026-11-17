import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    providers: provideSectionProviders(),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./welcome/welcome.component').then((m) => m.WelcomeComponent),
      },
    ],
  },
];
