import { ErrorHandler, Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { LoggingService } from './logging.service';

@Injectable()
export class ErrorHandlerService extends ErrorHandler {
  private loggingService = inject(LoggingService);

  override handleError(error: Error) {
    if (environment.production) {
      this.loggingService.logException(error); // Manually log exception
    }
    // The console too in production: without it, a click handler that throws looks like a
    // button that does nothing, and nothing in the browser says why.
    super.handleError(error);
  }
}
