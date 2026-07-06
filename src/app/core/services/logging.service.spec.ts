import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { LoggingService } from './logging.service';

/** Minimal fake of the App Insights instance LoggingService uses. */
function makeFakeAi() {
  return {
    loadAppInsights: jasmine.createSpy('loadAppInsights'),
    context: { application: { ver: '' } },
    trackPageView: jasmine.createSpy('trackPageView'),
    trackEvent: jasmine.createSpy('trackEvent'),
    trackMetric: jasmine.createSpy('trackMetric'),
    trackException: jasmine.createSpy('trackException'),
    trackTrace: jasmine.createSpy('trackTrace'),
  };
}

/**
 * Builds a fake `@microsoft/applicationinsights-web` module whose
 * `ApplicationInsights` constructor returns `fakeAi` and records the config it
 * was constructed with on `fakeAi.capturedConfig`.
 */
function makeFakeModule(
  fakeAi: ReturnType<typeof makeFakeAi> & { capturedConfig?: any }
) {
  return {
    ApplicationInsights: function (cfg: any) {
      fakeAi.capturedConfig = cfg;
      return fakeAi;
    },
    DistributedTracingModes: { AI: 1 },
  };
}

/** Test subclass that forces the "browser + key" deferral path and controls the import. */
@Injectable()
class TestableLoggingService extends LoggingService {
  // Default to a never-settling promise: every test assigns importResult before
  // calling runInitialize(), and an eagerly-rejected default would surface as an
  // unhandled rejection (order-dependent Karma failure).
  importResult: Promise<any> = new Promise<never>(() => {});
  protected override isTelemetryEnabled(): boolean {
    return true;
  }
  // Prevent the constructor from auto-scheduling; tests call initialize() manually.
  protected override scheduleInitialize(): void {
    /* no-op in tests */
  }
  protected override importSdk(): Promise<any> {
    return this.importResult;
  }
  runInitialize(): Promise<void> {
    return (this as unknown as { initialize(): Promise<void> }).initialize();
  }
}

describe('LoggingService', () => {
  it('should be created (no-key stub path)', () => {
    const service = TestBed.inject(LoggingService);
    expect(service).toBeTruthy();
  });

  it('stub path: log methods do not throw and logException console.errors', () => {
    const service = TestBed.inject(LoggingService);
    const err = new Error('boom');
    const consoleSpy = spyOn(console, 'error');

    expect(() => service.logEvent('E')).not.toThrow();
    expect(() => service.logMetric('M', 1)).not.toThrow();
    expect(() => service.logTrace('T')).not.toThrow();
    expect(() => service.logPageView('P')).not.toThrow();
    service.logException(err);

    expect(consoleSpy).toHaveBeenCalledWith(err);
  });

  describe('deferred load path', () => {
    let service: TestableLoggingService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggingService, useClass: TestableLoggingService },
        ],
      });
      service = TestBed.inject(LoggingService) as TestableLoggingService;
    });

    it('buffers pre-load calls and flushes them in order after load', async () => {
      const fakeAi = makeFakeAi();
      service.importResult = Promise.resolve(makeFakeModule(fakeAi));

      service.logEvent('first');
      service.logMetric('second', 2);
      service.logTrace('third');
      expect(fakeAi.trackEvent).not.toHaveBeenCalled();

      await service.runInitialize();

      expect(fakeAi.trackEvent).toHaveBeenCalledWith(
        { name: 'first' },
        undefined
      );
      expect(fakeAi.trackMetric).toHaveBeenCalledWith(
        { name: 'second', average: 2 },
        undefined
      );
      expect(fakeAi.trackTrace).toHaveBeenCalledWith(
        { message: 'third' },
        undefined
      );
    });

    it('applies the exact App Insights config, loads it, and stamps the version on load', async () => {
      const fakeAi = makeFakeAi() as ReturnType<typeof makeFakeAi> & {
        capturedConfig?: any;
      };
      service.importResult = Promise.resolve(makeFakeModule(fakeAi));

      await service.runInitialize();

      const cfg = fakeAi.capturedConfig.config;
      expect(cfg.instrumentationKey).toBe(
        environment.appInsights.instrumentationKey
      );
      expect(cfg.enableAutoRouteTracking).toBeTrue();
      expect(cfg.disableFetchTracking).toBeFalse();
      expect(cfg.disableCorrelationHeaders).toBeFalse();
      expect(cfg.enableCorsCorrelation).toBeTrue();
      expect(cfg.distributedTracingMode).toBe(1); // DistributedTracingModes.AI
      expect(cfg.correlationHeaderExcludedDomains).toEqual(['*.auth0.com']);
      expect(cfg.enableRequestHeaderTracking).toBeFalse();
      expect(cfg.enableResponseHeaderTracking).toBeTrue();
      expect(fakeAi.loadAppInsights).toHaveBeenCalledTimes(1);
      expect(fakeAi.context.application.ver).toBe(environment.version);
    });

    it('logException console.errors immediately before load and uploads after flush', async () => {
      const fakeAi = makeFakeAi();
      service.importResult = Promise.resolve(makeFakeModule(fakeAi));
      const err = new Error('pre-load');
      const consoleSpy = spyOn(console, 'error');

      service.logException(err);
      expect(consoleSpy).toHaveBeenCalledWith(err);
      expect(fakeAi.trackException).not.toHaveBeenCalled();

      await service.runInitialize();
      expect(fakeAi.trackException).toHaveBeenCalledWith({
        exception: err,
        severityLevel: undefined,
      });
    });

    it('caps the buffer at 50 and drops the oldest', async () => {
      const fakeAi = makeFakeAi();
      service.importResult = Promise.resolve(makeFakeModule(fakeAi));

      for (let i = 0; i < 51; i++) {
        service.logEvent(`e${i}`);
      }
      await service.runInitialize();

      expect(fakeAi.trackEvent).toHaveBeenCalledTimes(50);
      // Oldest (e0) dropped; e1 is the first flushed.
      expect(fakeAi.trackEvent.calls.first().args).toEqual([
        { name: 'e1' },
        undefined,
      ]);
      // A dropped-count trace is emitted after flush.
      expect(fakeAi.trackTrace).toHaveBeenCalled();
    });

    it('keeps running (no throw) when the SDK import fails', async () => {
      service.importResult = Promise.reject(new Error('network fail'));
      spyOn(console, 'error');

      service.logEvent('lost');
      await service.runInitialize();

      expect(() => service.logEvent('after')).not.toThrow();
    });
  });
});
