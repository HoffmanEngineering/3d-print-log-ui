import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

export interface PrinterThumbnail {
  printerId: number;
  thumbnailUrl: string | null;
}

/**
 * Comfortably under the roughly six-hour minimum SAS validity, so a URL held here never
 * expires in place.
 */
export const THUMBNAIL_TTL_MS = 60 * 60 * 1000;

/**
 * `idle` has never fetched, `loaded` holds a real answer (possibly an empty one), and
 * `error` is a fetch that failed. The distinction matters: an empty map is otherwise
 * indistinguishable from "not fetched yet", and a fetch-on-empty rule would make every
 * avatar on the page start its own request, then re-request forever for the many users who
 * have no printer photos at all.
 */
type Phase = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * One signed thumbnail per printer the current user owns, fetched once and shared by every
 * surface that names a printer.
 *
 * This is what keeps printer photos off public print pages. The endpoint behind it is
 * authenticated-only, so an anonymous visitor gets an empty map and therefore no avatars -
 * a structural guarantee rather than a guard repeated on six surfaces.
 */
@Injectable({ providedIn: 'root' })
export class PrinterThumbnailStore {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly url = `${environment.printLogApiUrl}/api/Printers/thumbnails`;

  private readonly map = signal<ReadonlyMap<number, string>>(new Map());
  private readonly phase = signal<Phase>('idle');
  private fetchedAt = 0;

  /**
   * Bumped on every completed fetch, so a consumer can tell "the same URL, freshly
   * confirmed" from "the same URL I already gave up on".
   *
   * Signing is bucketed to six hours server-side, which makes a re-signed URL
   * byte-identical - deliberately, so the browser image cache can hit. That means a
   * consumer suppressing a URL that failed cannot use the URL itself to decide when to try
   * again: within a bucket the refreshed value is the value it is suppressing.
   */
  readonly generation = signal(0);

  /** The single in-flight request, shared by every caller that arrives during it. */
  private inFlight: Observable<PrinterThumbnail[]> | null = null;

  /** Debounces `noteLoadFailure` so a dead blob cannot become a refetch loop. */
  private failureRefreshQueued = false;

  /**
   * The signed thumbnail for one printer, or null. Reading this is what triggers the
   * fetch, so callers need no lifecycle of their own.
   */
  thumbnailFor(printerId: number): string | null {
    this.ensureLoaded();
    return this.map().get(printerId) ?? null;
  }

  /**
   * Drops the cached map so the next read refetches. Called after every printer-image
   * mutation: without it an avatar keeps the old photo for up to the TTL.
   */
  invalidate(): void {
    this.map.set(new Map());
    this.phase.set('idle');
    this.fetchedAt = 0;
    this.inFlight = null;
  }

  /**
   * Reports that a URL from this map failed to load - usually a blob deleted elsewhere.
   * At most one refresh is queued per turn, so a page full of broken avatars produces one
   * request rather than one per image.
   */
  noteLoadFailure(printerId: number): void {
    if (this.failureRefreshQueued) return;
    if (!this.map().has(printerId)) return;

    this.failureRefreshQueued = true;
    queueMicrotask(() => {
      this.failureRefreshQueued = false;
      this.invalidate();
    });
  }

  private ensureLoaded(): void {
    // `loggedIn` is null until Auth0 resolves. Treating that as signed-out is the safe
    // reading: the request would 401, and the next read retries once it is known.
    if (!this.authService.loggedIn) {
      // A sign-out has to clear what a signed-in session fetched, or the previous user's
      // photos stay on screen.
      if (this.phase() !== 'idle') this.invalidate();
      return;
    }

    const phase = this.phase();

    // Never while loading; never after an error until invalidate() or the TTL - that is
    // the backoff.
    if (phase === 'loading') return;
    if (phase !== 'idle' && Date.now() - this.fetchedAt < THUMBNAIL_TTL_MS)
      return;

    this.phase.set('loading');
    this.inFlight = this.http.get<PrinterThumbnail[]>(this.url).pipe(
      tap((entries) => {
        this.map.set(
          new Map(
            entries
              .filter((e) => !!e.thumbnailUrl)
              .map((e) => [e.printerId, e.thumbnailUrl as string])
          )
        );
        this.phase.set('loaded');
        this.fetchedAt = Date.now();
        this.generation.update((n) => n + 1);
      }),
      catchError(() => {
        // Degrade to no photos rather than breaking the page. The phase records the
        // failure so this does not turn into a request per render.
        this.phase.set('error');
        this.fetchedAt = Date.now();
        return of([] as PrinterThumbnail[]);
      }),
      finalize(() => (this.inFlight = null)),
      shareReplay(1)
    );

    this.inFlight.subscribe();
  }
}
