import { TestBed } from '@angular/core/testing';

import { ErrorHandlerService } from './error-handler.service';
import { LoggingService } from './logging.service';

describe('ErrorHandlerService', () => {
  beforeEach(() => {
    const mockLoggingService = jasmine.createSpyObj<LoggingService>(
      'LoggingService',
      ['logException']
    );

    TestBed.configureTestingModule({
      providers: [{ provide: LoggingService, useValue: mockLoggingService }],
    });
  });

  it('should be created', () => {
    const service: ErrorHandlerService = TestBed.get(ErrorHandlerService);
    expect(service).toBeTruthy();
  });
});
