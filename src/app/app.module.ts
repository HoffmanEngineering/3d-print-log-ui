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
import { LoadingBarModule } from '@ngx-loading-bar/core';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { AdsenseModule } from 'ng2-adsense';
import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptorService } from './core/http/auth-interceptor.service';
import { ErrorHandlerService } from './core/services/error-handler.service';
import { SharedModule } from './shared/shared.module';

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
    SharedModule,
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
    { provide: ErrorHandler, useClass: ErrorHandlerService },
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(withEventReplay()),
  ],
})
export class AppModule {}
