import { Signal, signal } from '@angular/core';
import { Observable, OperatorFunction, defer, merge, of, timer } from 'rxjs';
import { concatMap, delay, filter, map, tap } from 'rxjs/operators';

/**
 * Timing rules that stop a loading placeholder from flashing.
 *
 * A skeleton exists to explain a wait. When the response lands in 30ms there is
 * no wait to explain, and painting grey boxes for two frames reads as a glitch
 * rather than as feedback — so the placeholder is worse than showing nothing.
 * Two thresholds fix that, and BOTH are needed:
 *
 * - `delayMs` — show nothing at all until the request has been in flight this
 *   long. Under ~100ms a response feels instantaneous, so anything that resolves
 *   inside the delay should simply appear.
 * - `minVisibleMs` — once the placeholder IS on screen, leave it there this
 *   long. Without it the flash just moves: a 210ms response would show the
 *   skeleton for 10ms, which is the worst outcome of all.
 *
 * The defaults are deliberately shared by every consumer. A page that deferred
 * for 200ms next to one that deferred for 500ms would read as the slower page
 * being broken.
 */
export interface DeferredSkeletonTimings {
  /** How long a request may run before a placeholder is shown at all. */
  delayMs?: number;
  /** How long a placeholder stays up once it has been shown. */
  minVisibleMs?: number;
}

export const DEFERRED_SKELETON_DELAY_MS = 200;
export const DEFERRED_SKELETON_MIN_VISIBLE_MS = 400;

function resolveTimings(
  timings: DeferredSkeletonTimings
): Required<DeferredSkeletonTimings> {
  return {
    delayMs: timings.delayMs ?? DEFERRED_SKELETON_DELAY_MS,
    minVisibleMs: timings.minVisibleMs ?? DEFERRED_SKELETON_MIN_VISIBLE_MS,
  };
}

/**
 * Emits `skeletonValue` only if `source` is still pending after `delayMs`, and
 * holds the source's own value back until the skeleton has had its `minVisibleMs`.
 *
 * Drop-in replacement for a `startWith(LOADING_STATE)` that fires unconditionally.
 *
 * The source is subscribed immediately, not after the delay — the request and
 * the timer start together, so deferring the placeholder never delays the data.
 * Everything is scoped to a single subscription via `defer`, so a `switchMap`
 * that re-subscribes per route param gets a fresh pair of timers and, more
 * importantly, cancels the in-flight request on unsubscribe the way it would
 * without this operator.
 *
 * PRECONDITION: the source must emit at least one value. The skeleton value is
 * a transitional state with no way back out on its own, so if the source can
 * complete empty — an upstream `filter`, an `EMPTY` short-circuit — that
 * emission would be the last thing a signal consumer ever sees, leaving it on
 * the loading state permanently. A source that completes empty BEFORE the delay
 * is handled (no skeleton is emitted at all); one that completes empty after
 * the skeleton is already up cannot be, because there is no value to fall back
 * to. Give such a source an explicit `defaultIfEmpty` rather than relying on
 * this operator to invent one.
 */
export function withDeferredSkeleton<T>(
  skeletonValue: T,
  timings: DeferredSkeletonTimings = {}
): OperatorFunction<T, T> {
  const { delayMs, minVisibleMs } = resolveTimings(timings);

  return (source: Observable<T>) =>
    defer(() => {
      const startedAt = Date.now();
      // Read by the skeleton timer below. Set in `concatMap` — i.e. the moment
      // the source produces a value, before any hold is applied — so a response
      // that lands at 199ms suppresses the 200ms skeleton instead of racing it.
      let settled = false;
      // Guards the empty-source case: a source that completes without ever
      // emitting would otherwise leave the skeleton as the LAST value the
      // consumer ever sees, stranding it on the loading state forever.
      let completed = false;

      const result$ = source.pipe(
        concatMap((value) => {
          const elapsed = Date.now() - startedAt;
          settled = true;

          // Never shown, so there is nothing to hold for.
          if (elapsed < delayMs) {
            return of(value);
          }

          const holdFor = delayMs + minVisibleMs - elapsed;
          return holdFor > 0 ? of(value).pipe(delay(holdFor)) : of(value);
        }),
        tap({
          complete: () => {
            completed = true;
          },
        })
      );

      const skeleton$ = timer(delayMs).pipe(
        filter(() => !settled && !completed),
        map(() => skeletonValue)
      );

      return merge(skeleton$, result$);
    });
}

/**
 * The same two thresholds for callers that flip a boolean rather than composing
 * an observable — imperative list components that set a flag in a `subscribe`.
 *
 * `visible` is a signal so it works whether or not the host component is
 * `OnPush`: the timers fire outside any template's change detection, and a
 * plain field mutated from a `setTimeout` would not reliably repaint.
 *
 * Call `destroy()` from `ngOnDestroy` — a pending timer that sets a signal on a
 * torn-down component is a leak.
 */
export class DeferredSkeletonController {
  private readonly timings: Required<DeferredSkeletonTimings>;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;
  /**
   * In-flight requests, not a boolean.
   *
   * Without the count, the FIRST of two overlapping requests to settle would
   * schedule the hide while the second was still running, and the second's
   * `stop()` would then no-op against an already-hidden indicator — the
   * placeholder would disappear mid-load and could not be brought back.
   */
  private pending = 0;

  private readonly _visible = signal(false);

  /** True while the placeholder should be on screen. */
  readonly visible: Signal<boolean> = this._visible.asReadonly();

  constructor(timings: DeferredSkeletonTimings = {}) {
    this.timings = resolveTimings(timings);
  }

  /**
   * A request went in flight. Safe to call while already loading: overlapping
   * requests keep the current placeholder up rather than restarting its dwell,
   * and it stays up until the last of them settles.
   */
  start(): void {
    this.pending++;
    this.clearHideTimer();

    if (this._visible() || this.showTimer !== null) {
      return;
    }

    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.shownAt = Date.now();
      this._visible.set(true);
    }, this.timings.delayMs);
  }

  /** A request settled — succeeded or failed, both count. */
  stop(): void {
    if (this.pending > 0) {
      this.pending--;
    }

    // Another request is still running: leave both the pending reveal and the
    // visible placeholder alone.
    if (this.pending > 0) {
      return;
    }

    this.clearShowTimer();

    if (!this._visible() || this.hideTimer !== null) {
      return;
    }

    const remaining = this.timings.minVisibleMs - (Date.now() - this.shownAt);
    if (remaining <= 0) {
      this._visible.set(false);
      return;
    }

    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this._visible.set(false);
    }, remaining);
  }

  destroy(): void {
    this.pending = 0;
    this.clearShowTimer();
    this.clearHideTimer();
  }

  private clearShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
