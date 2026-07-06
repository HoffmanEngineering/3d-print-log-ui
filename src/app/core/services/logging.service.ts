import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'src/environments/environment';

/** The subset of the App Insights API that LoggingService depends on. */
interface TelemetrySink {
  trackPageView(v: { name?: string; uri?: string }): void;
  trackEvent(v: { name: string }, properties?: { [key: string]: any }): void;
  trackMetric(
    v: { name: string; average: number },
    properties?: { [key: string]: any }
  ): void;
  trackException(v: { exception: Error; severityLevel?: number }): void;
  trackTrace(v: { message: string }, properties?: { [key: string]: any }): void;
}

const MAX_BUFFER = 50;

/**
 * Wraps Azure Application Insights. The heavy SDK (~0.9 MB) is loaded lazily
 * via dynamic import after first paint, so it stays out of the eager bundle.
 * Until it loads, telemetry runs against a stub and calls are buffered; once
 * loaded, buffered calls flush in order. With no instrumentation key (unit
 * tests, SSR) the stub is permanent — identical to the previous behavior.
 */
@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private sink: TelemetrySink = this.stubSink();
  private loaded = false;
  private buffer: Array<(sink: TelemetrySink) => void> = [];
  private dropped = 0;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    if (this.isTelemetryEnabled()) {
      this.scheduleInitialize();
    } else {
      // No key / not a browser: permanent stub, no buffering.
      this.loaded = true;
    }
  }

  logPageView(name?: string, url?: string) {
    this.dispatch((s) => s.trackPageView({ name, uri: url }));
  }

  logEvent(name: string, properties?: { [key: string]: any }) {
    this.dispatch((s) => s.trackEvent({ name }, properties));
  }

  logMetric(
    name: string,
    average: number,
    properties?: { [key: string]: any }
  ) {
    this.dispatch((s) => s.trackMetric({ name, average }, properties));
  }

  logException(exception: Error, severityLevel?: number) {
    // Surface immediately while the SDK is still loading so errors are never lost.
    if (!this.loaded) {
      console.error(exception);
    }
    this.dispatch((s) => s.trackException({ exception, severityLevel }));
  }

  logTrace(message: string, properties?: { [key: string]: any }) {
    this.dispatch((s) => s.trackTrace({ message }, properties));
  }

  protected isTelemetryEnabled(): boolean {
    return (
      this.isBrowser &&
      !!environment?.appInsights?.instrumentationKey &&
      environment.appInsights.instrumentationKey !== ''
    );
  }

  protected scheduleInitialize(): void {
    const run = () => {
      this.loadPromise ??= this.initialize();
    };
    const g = globalThis as {
      requestIdleCallback?: (cb: () => void) => void;
      requestAnimationFrame?: (cb: () => void) => void;
    };
    if (typeof g.requestIdleCallback === 'function') {
      g.requestIdleCallback(run);
    } else if (typeof g.requestAnimationFrame === 'function') {
      // Safari has no requestIdleCallback: wait for the next frame (post-paint),
      // then a macrotask, so the import stays off the first-paint critical path.
      // (Plain setTimeout(0) can fire before first paint during bootstrap.)
      g.requestAnimationFrame(() => setTimeout(run, 0));
    } else {
      setTimeout(run, 0);
    }
  }

  /** Dynamic-import seam; overridable in tests. */
  protected importSdk(): Promise<
    typeof import('@microsoft/applicationinsights-web')
  > {
    return import('@microsoft/applicationinsights-web');
  }

  private async initialize(): Promise<void> {
    try {
      const mod = await this.importSdk();
      const appInsights = new mod.ApplicationInsights({
        config: {
          instrumentationKey: environment.appInsights.instrumentationKey!,
          enableAutoRouteTracking: true,
          disableFetchTracking: false,
          disableCorrelationHeaders: false,
          enableCorsCorrelation: true,
          distributedTracingMode: mod.DistributedTracingModes.AI,
          correlationHeaderExcludedDomains: ['*.auth0.com'],
          enableRequestHeaderTracking: false,
          enableResponseHeaderTracking: true,
        },
      });
      appInsights.loadAppInsights();
      appInsights.context.application.ver = environment.version;
      this.activate(appInsights as unknown as TelemetrySink);
    } catch (e) {
      // SDK failed to load: run silently. Pre-load exceptions already reached
      // the console at call time, so flush to a no-op sink to avoid double logs.
      console.error(
        'Application Insights failed to load; telemetry disabled',
        e
      );
      this.activate(this.silentSink());
    }
  }

  private activate(sink: TelemetrySink) {
    this.sink = sink;
    this.loaded = true;
    for (const fn of this.buffer) {
      fn(sink);
    }
    this.buffer = [];
    if (this.dropped > 0) {
      sink.trackTrace({
        message: `LoggingService dropped ${this.dropped} buffered telemetry entries before load`,
      });
      this.dropped = 0;
    }
  }

  private dispatch(fn: (sink: TelemetrySink) => void) {
    if (this.loaded) {
      fn(this.sink);
      return;
    }
    if (this.buffer.length >= MAX_BUFFER) {
      this.buffer.shift();
      this.dropped++;
    }
    this.buffer.push(fn);
  }

  /** Stub used before load / when no key: exceptions and traces log, rest no-op. */
  private stubSink(): TelemetrySink {
    return {
      trackPageView: () => {},
      trackEvent: () => {},
      trackMetric: () => {},
      trackException: (v) => console.error(v.exception),
      trackTrace: (v, properties) => console.log(v.message, { properties }),
    };
  }

  /** Fully silent sink used after a failed SDK load. */
  private silentSink(): TelemetrySink {
    return {
      trackPageView: () => {},
      trackEvent: () => {},
      trackMetric: () => {},
      trackException: () => {},
      trackTrace: () => {},
    };
  }
}
