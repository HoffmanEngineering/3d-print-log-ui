import {
  enableProdMode,
  mergeApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Zone.js change detection is a browser-only choice: the server bootstrap in
// main.server.ts has never had it.
bootstrapApplication(
  AppComponent,
  mergeApplicationConfig(appConfig, {
    providers: [provideZoneChangeDetection()],
  })
).catch((err) => console.error(err));
