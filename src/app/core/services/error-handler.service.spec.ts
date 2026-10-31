import type { MockedObject } from 'vitest';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { ErrorHandlerService } from './error-handler.service';
import { LoggingService } from './logging.service';

describe('ErrorHandlerService', () => {
  let loggingService: MockedObject<LoggingService>;
  let service: ErrorHandlerService;
  const production = environment.production;

  beforeEach(() => {
    loggingService = {
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LoggingService, useValue: loggingService },
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

  it('reports uncaught errors to logging in production', () => {
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
    expect(consoleHandler).not.toHaveBeenCalled();
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
});
