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

  /** Collapses the failures reported in one turn into a single refresh. */
  private failureRefreshQueued = false;

  /**
   * URLs that have already had their one failure-driven refresh.
   *
   * This is what stops a dead blob from becoming a refetch loop. The refresh comes back
   * with the same bucketed URL, the consumer retries it once (the generation moved), and
   * when that fails too the report lands here and is dropped. Without it every retry
   * queued another refresh: about one request a second for as long as the page was open,
   * until the API's per-user rate limiter answered 429 - to the user's printlog-bridge as
   * well, which shares that budget.
   *
   * Cleared by `invalidate()`, so a printer-image mutation starts fresh, and pruned to the
   * current map on every completed fetch, so a URL the API stops handing out is forgotten.
   */
  private readonly failureRefreshed = new Set<string>();

  /** Collapses the many reads of one render pass into a single deferred check. */
  private ensureQueued = false;

  /**
   * The signed thumbnail for one printer, or null. Reading this is what triggers the
   * fetch, so callers need no lifecycle of their own.
   *
   * The fetch is scheduled on a microtask rather than started inline because this is read
   * from inside `computed()`s, and Angular forbids writing a signal during one (NG0600).
   * Started inline it threw out of the first avatar that rendered, which took the whole
   * print-list table down with it - the cell template never completed, so not one row
   * appeared.
   */
  thumbnailFor(printerId: number): string | null {
    this.scheduleEnsureLoaded();
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
    this.failureRefreshed.clear();
  }

  /**
   * Reports that `url`, handed out for `printerId`, failed to load - usually a blob
   * deleted or replaced elsewhere. Each URL gets at most one refresh: a URL that fails
   * again after it queues nothing until an `invalidate()`. The TTL refetch still bumps
   * the generation, so a consumer gets one more attempt at it then, at no extra cost.
   *
   * The refresh keeps the current map rather than clearing it, so the other avatars on
   * the page keep their photos, and their own failures, which arrive as separate events,
   * still match the map and are marked as covered by the same request. Failures in one
   * turn share one refresh, and a failure while a fetch is in flight is answered by that
   * fetch, so a page full of broken avatars produces one request rather than one per
   * image.
   */
  noteLoadFailure(printerId: number, url: string): void {
    // A late report for a URL the map no longer holds, such as one from before an
    // invalidate(), says nothing about the URL it holds now.
    if (this.map().get(printerId) !== url) return;
    if (this.failureRefreshed.has(url)) return;
    this.failureRefreshed.add(url);

    if (this.failureRefreshQueued) return;
    this.failureRefreshQueued = true;
    // Scheduled rather than started inline, so a write never lands inside a computed
    // (NG0600) whoever the caller is.
    queueMicrotask(() => {
      this.failureRefreshQueued = false;
      this.refreshAfterFailure();
    });
  }

  private refreshAfterFailure(): void {
    if (!this.authService.loggedIn) return;
    // A fetch already in flight is the refresh: it completes with a new generation.
    if (this.phase() === 'loading') return;
    this.fetch();
  }

  private scheduleEnsureLoaded(): void {
    if (this.ensureQueued) return;
    this.ensureQueued = true;
    queueMicrotask(() => {
      this.ensureQueued = false;
      this.ensureLoaded();
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

    this.fetch();
  }

  private fetch(): void {
    this.phase.set('loading');
    this.inFlight = this.http.get<PrinterThumbnail[]>(this.url).pipe(
      tap((entries) => {
        const map = new Map(
          entries
            .filter((e) => !!e.thumbnailUrl)
            .map((e) => [e.printerId, e.thumbnailUrl as string])
        );
        const handedOut = new Set(map.values());
        for (const url of this.failureRefreshed) {
          if (!handedOut.has(url)) this.failureRefreshed.delete(url);
        }
        this.map.set(map);
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
