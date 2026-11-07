import type { MockedObject } from 'vitest';
import { ErrorHandler, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { ChunkLoadRecoveryService } from '../routing/chunk-load-recovery';
import {
  ErrorHandlerService,
  provideAppErrorHandling,
} from './error-handler.service';
import { LoggingService } from './logging.service';

describe('ErrorHandlerService', () => {
  let loggingService: MockedObject<LoggingService>;
  let service: ErrorHandlerService;
  let recover: ReturnType<typeof vi.fn>;
  const production = environment.production;

  beforeEach(() => {
    loggingService = {
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
    recover = vi.fn().mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LoggingService, useValue: loggingService },
        { provide: ChunkLoadRecoveryService, useValue: { recover } },
      ],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    (
      environment as {
        production: boolean;
      }
    ).production = production;
  });

  // A click handler that throws in production otherwise looks like a button that does nothing,
  // with nothing in the console to say why.
  it('reports uncaught errors to logging and the console in production', () => {
    (
      environment as {
        production: boolean;
      }
    ).production = true;
    const consoleHandler = vi
      .spyOn(ErrorHandler.prototype, 'handleError')
      .mockReturnValue(undefined);
    const error = new Error('boom');

    service.handleError(error);

    expect(loggingService.logException).toHaveBeenCalledTimes(1);

    expect(loggingService.logException).toHaveBeenCalledWith(error);
    expect(consoleHandler).toHaveBeenCalledTimes(1);

    expect(consoleHandler).toHaveBeenCalledWith(error);
  });

  it('leaves uncaught errors to the console outside production', () => {
    (
      environment as {
        production: boolean;
      }
    ).production = false;
    const consoleHandler = vi
      .spyOn(ErrorHandler.prototype, 'handleError')
      .mockReturnValue(undefined);
    const error = new Error('boom');

    service.handleError(error);

    expect(consoleHandler).toHaveBeenCalledTimes(1);

    expect(consoleHandler).toHaveBeenCalledWith(error);
    expect(loggingService.logException).not.toHaveBeenCalled();
  });

  describe('chunk load errors', () => {
    const chunkError = new TypeError(
      'Failed to fetch dynamically imported module: https://www.3dprintlog.com/chunk-ABC.js'
    );

    beforeEach(() => {
      (
        environment as {
          production: boolean;
        }
      ).production = true;
      vi.spyOn(ErrorHandler.prototype, 'handleError').mockReturnValue(
        undefined
      );
    });

    it('hands every error to chunk recovery', () => {
      service.handleError(chunkError);

      expect(recover).toHaveBeenCalledExactlyOnceWith(chunkError);
    });

    // The page is about to reload onto the new build; the reload is logged as an event.
    it('does not report an exception when recovery reloads the page', () => {
      recover.mockReturnValue(true);

      service.handleError(chunkError);

      expect(loggingService.logException).not.toHaveBeenCalled();
    });

    it('reports the exception when recovery declines (already reloaded once)', () => {
      service.handleError(chunkError);

      expect(loggingService.logException).toHaveBeenCalledWith(chunkError);
    });
  });
});

describe('provideAppErrorHandling', () => {
  // Zoneless Angular reports nothing from outside its own call stacks unless the browser's
  // global listeners are registered: an unhandled promise rejection never reached logging.
  it('routes unhandled promise rejections to ErrorHandlerService', () => {
    const handleError = vi
      .spyOn(ErrorHandlerService.prototype, 'handleError')
      .mockReturnValue(undefined);
    // Capture the listener rather than dispatching a real event: the test runner reports any
    // unhandledrejection that reaches the window as a failure of its own.
    const addListener = vi.spyOn(window, 'addEventListener');
    TestBed.configureTestingModule({
      providers: [
        provideAppErrorHandling(),
        {
          provide: LoggingService,
          useValue: { logException: vi.fn(), logEvent: vi.fn() },
        },
      ],
      rethrowApplicationErrors: false,
    });
    TestBed.inject(Injector);

    const registration = addListener.mock.calls.find(
      ([type]) => type === 'unhandledrejection'
    );
    expect(registration).toBeDefined();
    const listener = registration![1] as (e: unknown) => void;
    const reason = new Error('rejected');
    listener({ reason, preventDefault: vi.fn() });

    expect(handleError).toHaveBeenCalledWith(reason);
    expect(TestBed.inject(ErrorHandler)).toBeInstanceOf(ErrorHandlerService);
  });
});
