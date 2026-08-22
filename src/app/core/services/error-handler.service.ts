import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { LoggingService } from './logging.service';

@Injectable()
export class ErrorHandlerService extends ErrorHandler {
  constructor(private loggingService: LoggingService) {
    super();
  }

  override handleError(error: Error) {
    if (environment.production) {
      this.loggingService.logException(error); // Manually log exception
    } else {
      super.handleError(error);
    }
  }
}
