import {
  enableProdMode,
  mergeApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Zoneless: change detection runs when a signal a template reads changes, an
// input or a template event marks a view, or code calls markForCheck(). Nothing
// is patched into the browser's async APIs. The server bootstrap
// (main.server.ts) has never had zone.js either.
bootstrapApplication(
  AppComponent,
  mergeApplicationConfig(appConfig, {
    providers: [provideZonelessChangeDetection()],
  })
).catch((err) => console.error(err));
