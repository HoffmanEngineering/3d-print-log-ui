import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { ErrorHandlerService } from './error-handler.service';
import { LoggingService } from './logging.service';

describe('ErrorHandlerService', () => {
  let loggingService: jasmine.SpyObj<LoggingService>;
  let service: ErrorHandlerService;
  const production = environment.production;

  beforeEach(() => {
    loggingService = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
    ]);
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LoggingService, useValue: loggingService },
      ],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    (environment as { production: boolean }).production = production;
  });

  // A click handler that throws in production otherwise looks like a button that does nothing,
  // with nothing in the console to say why.
  it('reports uncaught errors to logging and the console in production', () => {
    (environment as { production: boolean }).production = true;
    const consoleHandler = spyOn(ErrorHandler.prototype, 'handleError');
    const error = new Error('boom');

    service.handleError(error);

    expect(loggingService.logException).toHaveBeenCalledOnceWith(error);
    expect(consoleHandler).toHaveBeenCalledOnceWith(error);
  });

  it('leaves uncaught errors to the console outside production', () => {
    (environment as { production: boolean }).production = false;
    const consoleHandler = spyOn(ErrorHandler.prototype, 'handleError');
    const error = new Error('boom');

    service.handleError(error);

    expect(consoleHandler).toHaveBeenCalledOnceWith(error);
    expect(loggingService.logException).not.toHaveBeenCalled();
  });
});
