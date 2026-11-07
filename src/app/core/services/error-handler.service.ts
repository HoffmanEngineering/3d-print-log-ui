import {
  EnvironmentProviders,
  ErrorHandler,
  Injectable,
  inject,
  makeEnvironmentProviders,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { environment } from 'src/environments/environment';
import { ChunkLoadRecoveryService } from '../routing/chunk-load-recovery';
import { LoggingService } from './logging.service';

@Injectable()
export class ErrorHandlerService extends ErrorHandler {
  private loggingService = inject(LoggingService);
  private chunkLoadRecovery = inject(ChunkLoadRecoveryService);

  override handleError(error: Error) {
    // A lazy chunk from the previous deploy: the page reloads onto the new build, and the
    // reload is logged as an event rather than as an exception.
    const reloading = this.chunkLoadRecovery.recover(error);
    if (environment.production && !reloading) {
      this.loggingService.logException(error); // Manually log exception
    }
    // The console too in production: without it, a click handler that throws looks like a
    // button that does nothing, and nothing in the browser says why.
    super.handleError(error);
  }
}

/**
 * The app's ErrorHandler, plus Angular's browser listeners for `error` and
 * `unhandledrejection`. The app is zoneless, so without those listeners an error thrown
 * outside Angular's own call stacks (a timer, a rejected promise nobody awaited) never reaches
 * ErrorHandlerService. App Insights' own window.onerror hook is turned off in LoggingService so
 * the same error is not reported twice.
 */
export function provideAppErrorHandling(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ErrorHandlerService },
  ]);
}
