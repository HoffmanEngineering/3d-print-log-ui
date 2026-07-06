import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationInsights,
  DistributedTracingModes,
} from '@microsoft/applicationinsights-web';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  appInsights: ApplicationInsights;
  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    if (
      isBrowser &&
      environment &&
      environment.appInsights &&
      environment.appInsights.instrumentationKey &&
      environment.appInsights.instrumentationKey !== ''
    ) {
      this.appInsights = new ApplicationInsights({
        config: {
          instrumentationKey: environment.appInsights.instrumentationKey,
          enableAutoRouteTracking: true, // option to log all route changes,
          disableFetchTracking: false,
          disableCorrelationHeaders: false,
          enableCorsCorrelation: true,
          distributedTracingMode: DistributedTracingModes.AI,
          correlationHeaderExcludedDomains: ['*.auth0.com'],
          enableRequestHeaderTracking: false,
          enableResponseHeaderTracking: true,
        },
      });
      this.appInsights.loadAppInsights();
      this.appInsights.context.application.ver = environment.version;
    } else {
      this.appInsights = {
        trackPageView: () => {},
        trackEvent: () => {},
        trackMetric: () => {},
        trackException: (exception: Error, severityLevel?: number) => {
          console.error(exception);
        },
        trackTrace: (message: string, properties?: { [key: string]: any }) => {
          console.log(message, { properties });
        },
      } as unknown as ApplicationInsights;
    }
  }

  logPageView(name?: string, url?: string) {
    // option to call manually
    this.appInsights.trackPageView({
      name,
      uri: url,
    });
  }

  logEvent(name: string, properties?: { [key: string]: any }) {
    this.appInsights.trackEvent({ name }, properties);
  }

  logMetric(
    name: string,
    average: number,
    properties?: { [key: string]: any }
  ) {
    this.appInsights.trackMetric({ name, average }, properties);
  }

  logException(exception: Error, severityLevel?: number) {
    this.appInsights.trackException({ exception, severityLevel });
  }

  logTrace(message: string, properties?: { [key: string]: any }) {
    this.appInsights.trackTrace({ message }, properties);
  }
}
