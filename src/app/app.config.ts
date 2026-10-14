import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
} from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideLoadingBarInterceptor } from '@ngx-loading-bar/http-client';
import { provideLoadingBarRouter } from '@ngx-loading-bar/router';
import { AdsenseModule } from 'ng2-adsense';
import { provideToastr } from 'ngx-toastr';

import { provideAppRouter } from './app.routes';
import { AchievementRefreshInterceptor } from './core/http/achievement-refresh.interceptor';
import { AuthInterceptorService } from './core/http/auth-interceptor.service';
import { CelebrationPresenter } from './core/services/achievement-celebration.service';
import { ErrorHandlerService } from './core/services/error-handler.service';
import { LazyCelebrationPresenter } from './shared/achievements/lazy-celebration-presenter';

/** Shared by the browser and the server; app.config.server.ts adds to it. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideAppRouter(),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    // Interceptors run in the order they are provided. The loading bar came
    // first when it was an imported module, so it stays first.
    provideLoadingBarInterceptor(),
    {
      multi: true,
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
    },
    {
      multi: true,
      provide: HTTP_INTERCEPTORS,
      useClass: AchievementRefreshInterceptor,
    },
    provideLoadingBarRouter(),
    provideToastr({
      timeOut: 5000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    importProvidersFrom(
      AdsenseModule.forRoot({
        adClient: 'ca-pub-7759478851543974',
        adSlot: 1448468680,
        adFormat: 'auto',
        fullWidthResponsive: true,
      })
    ),
    { provide: CelebrationPresenter, useClass: LazyCelebrationPresenter },
    { provide: ErrorHandler, useClass: ErrorHandlerService },
    provideClientHydration(withEventReplay()),
    {
      provide: MAT_DATE_LOCALE,
      useFactory: () =>
        typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    },
  ],
};
