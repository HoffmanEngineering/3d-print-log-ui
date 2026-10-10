import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { LoadingBarModule } from '@ngx-loading-bar/core';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptorService } from './core/http/auth-interceptor.service';
import { ErrorHandlerService } from './core/services/error-handler.service';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { AccountDeactivationBannerComponent } from './shared/account-deactivation-banner/account-deactivation-banner.component';
import { EmailNoticeComponent } from './shared/email-notice/email-notice.component';
import { NotifierNoticeComponent } from './shared/notifier-notice/notifier-notice.component';
import { AchievementBadgeDefsComponent } from './shared/achievements/achievement-badge-defs.component';
import { LazyCelebrationPresenter } from './shared/achievements/lazy-celebration-presenter';
import { AchievementRefreshInterceptor } from './core/http/achievement-refresh.interceptor';
import { CelebrationPresenter } from './core/services/achievement-celebration.service';

@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    // for HttpClient use:
    LoadingBarHttpClientModule,
    // for Core use:
    LoadingBarModule,
    // for Router use:
    LoadingBarRouterModule,
    NavbarComponent,
    AccountDeactivationBannerComponent,
    EmailNoticeComponent,
    NotifierNoticeComponent,
    AchievementBadgeDefsComponent,
    ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    AdsenseModule.forRoot({
      adClient: 'ca-pub-7759478851543974',
      adSlot: 1448468680,
      adFormat: 'auto',
      fullWidthResponsive: true,
    }),
  ],
  providers: [
    {
      multi: true,
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
    },
    {
      // After AuthInterceptorService: refreshes the unread count once a write that could earn
      // an achievement succeeds, so its celebration plays without waiting for the next poll.
      multi: true,
      provide: HTTP_INTERCEPTORS,
      useClass: AchievementRefreshInterceptor,
    },
    { provide: CelebrationPresenter, useClass: LazyCelebrationPresenter },
    { provide: ErrorHandler, useClass: ErrorHandlerService },
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(withEventReplay()),
    {
      provide: MAT_DATE_LOCALE,
      useFactory: () =>
        typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    },
  ],
})
export class AppModule {}
