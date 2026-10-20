import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./welcome/welcome.component').then((m) => m.WelcomeComponent),
      },
    ],
  },
];
