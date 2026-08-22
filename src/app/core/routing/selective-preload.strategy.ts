import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { catchError, defer, Observable, of } from 'rxjs';

/**
 * The slice of the Network Information API we act on. Typed structurally
 * because `navigator.connection` is not in the DOM lib and is unimplemented in
 * Safari and Firefox.
 *
 * @see https://developer.mozilla.org/docs/Web/API/NetworkInformation
 */
export interface NetworkInformationLike {
  /** True when the user has switched on data saver. */
  saveData?: boolean;
  /** Round-trip estimate bucketed as 'slow-2g' | '2g' | '3g' | '4g'. */
  effectiveType?: string;
}

/**
 * The live `navigator.connection` object, or `null` where it is unavailable.
 *
 * Injected rather than read inline so the strategy stays testable and so the
 * `navigator` access has exactly one guarded home — prerendering runs this code
 * in Node, where the global does not exist.
 */
export const NETWORK_INFORMATION =
  new InjectionToken<NetworkInformationLike | null>('NETWORK_INFORMATION', {
    providedIn: 'root',
    factory: () => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return null;
      }

      return (
        (navigator as Navigator & { connection?: NetworkInformationLike })
          .connection ?? null
      );
    },
  });

/** Effective connection types where a background chunk fetch is not worth it. */
const CONSTRAINED_EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g']);

/**
 * Preloads only the lazy routes that opt in with `data: { preload: true }`, and
 * only when the connection can afford it.
 *
 * The alternative, `PreloadAllModules`, pulls every feature chunk — including
 * the documentation site and the d3-backed analytics bundle — immediately after
 * first paint. Flagging just the sections a user reaches first keeps the
 * navigation win without that cost.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly connection = inject(NETWORK_INFORMATION);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!this.isBrowser) {
      return of(null);
    }

    if (route.data?.['preload'] !== true) {
      return of(null);
    }

    if (this.isConnectionConstrained()) {
      return of(null);
    }

    // `defer` so a loader that throws synchronously becomes an error
    // notification, and `catchError` so it stops there. RouterPreloader
    // subscribes to this without an error handler, so anything that escapes
    // tears down its subscription and nothing preloads again for the rest of
    // the session. Angular's own PreloadAllModules guards the same way.
    return defer(() => load()).pipe(catchError(() => of(null)));
  }

  /**
   * `navigator.connection` is a single long-lived object whose properties are
   * updated in place as the radio changes, so holding the reference is fine --
   * but the *properties* must be read per call. Snapshotting `saveData` or
   * `effectiveType` at construction would keep preloading after the user turns
   * on data saver mid-session.
   */
  private isConnectionConstrained(): boolean {
    const connection = this.connection;

    // No signal is not a bad signal — Safari and Firefox never report one.
    if (!connection) {
      return false;
    }

    if (connection.saveData === true) {
      return true;
    }

    return CONSTRAINED_EFFECTIVE_TYPES.has(connection.effectiveType ?? '');
  }
}
