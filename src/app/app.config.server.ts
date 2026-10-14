import {
  ApplicationConfig,
  importProvidersFrom,
  mergeApplicationConfig,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { FlexLayoutServerModule } from '@ngbracket/ngx-layout/server';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    importProvidersFrom(FlexLayoutServerModule),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
