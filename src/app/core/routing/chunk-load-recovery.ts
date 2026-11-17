import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { LoggingService } from '../services/logging.service';

/**
 * Chrome, Safari/Firefox and webpack's wording for a lazy chunk that failed to load. After a
 * deploy, a tab opened on the previous build still asks for the old hashed `chunk-*.js`, which
 * no longer exists.
 */
const CHUNK_LOAD_ERROR =
  /dynamically imported module|Importing a module script failed|ChunkLoadError/;

/** sessionStorage key holding when this tab last reloaded over a chunk load error. */
export const CHUNK_RELOAD_KEY = 'pl_chunk_reload_at';

/** A second chunk error this soon after a reload means the reload did not help. */
const CHUNK_RELOAD_WINDOW_MS = 60 * 1000;

export function isChunkLoadError(error: unknown): boolean {
  if (error == null) {
    return false;
  }
  if (typeof error === 'string') {
    return CHUNK_LOAD_ERROR.test(error);
  }
  if (typeof error !== 'object') {
    return false;
  }
  const e = error as { message?: unknown; name?: unknown; rejection?: unknown };
  return (
    (typeof e.message === 'string' && CHUNK_LOAD_ERROR.test(e.message)) ||
    (typeof e.name === 'string' && CHUNK_LOAD_ERROR.test(e.name)) ||
    (e.rejection !== undefined && isChunkLoadError(e.rejection))
  );
}

/**
 * Reloads the page once when a lazy chunk fails to load, so a tab left open across a deploy
 * picks up the new build instead of showing a dead link. Used by the router's navigation error
 * handler (with the URL the user was going to) and by ErrorHandlerService.
 */
@Injectable({ providedIn: 'root' })
export class ChunkLoadRecoveryService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly logging = inject(LoggingService);

  /** Returns true when it started a reload. */
  recover(error: unknown, targetUrl?: string): boolean {
    if (!this.isBrowser || !isChunkLoadError(error)) {
      return false;
    }

    const now = Date.now();
    try {
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY));
      if (last && now - last < CHUNK_RELOAD_WINDOW_MS) {
        return false;
      }
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    } catch {
      // Without storage there is no loop guard, so don't reload at all.
      return false;
    }

    this.logging.logEvent('App_ChunkLoadReload', { target: targetUrl });
    this.reload(targetUrl);
    return true;
  }

  /** Seam for tests: a real reload would end the test run. */
  protected reload(targetUrl?: string): void {
    if (targetUrl) {
      window.location.assign(targetUrl);
    } else {
      window.location.reload();
    }
  }
}
