import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  appInsights: ApplicationInsights;
  constructor() {
    if (
      environment &&
      environment.appInsights &&
      environment.appInsights.instrumentationKey &&
      environment.appInsights.instrumentationKey !== ''
    ) {
      this.appInsights = new ApplicationInsights({
        config: {
          instrumentationKey: environment.appInsights.instrumentationKey,
          enableAutoRouteTracking: true, // option to log all route changes
        },
      });
      this.appInsights.loadAppInsights();
    } else {
      this.appInsights = ({
        trackPageView: () => {},
        trackEvent: () => {},
        trackMetric: () => {},
        trackException: () => {},
        trackTrace: () => {},
      } as unknown) as ApplicationInsights;
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
