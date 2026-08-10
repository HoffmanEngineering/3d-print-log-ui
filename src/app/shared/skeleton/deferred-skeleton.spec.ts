import { fakeAsync, tick } from '@angular/core/testing';
import { EMPTY, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  DEFERRED_SKELETON_DELAY_MS,
  DEFERRED_SKELETON_MIN_VISIBLE_MS,
  DeferredSkeletonController,
  withDeferredSkeleton,
} from './deferred-skeleton';

type State = 'loading' | 'ready';

/** A response that takes `ms` to arrive, like the loader the detail page uses. */
function response(ms: number): Observable<State> {
  return of<State>('ready').pipe(delay(ms));
}

/** Collects everything the operator emits, tagged with when it emitted. */
function record(source: Observable<State>): { at: number; value: State }[] {
  const emissions: { at: number; value: State }[] = [];
  const startedAt = Date.now();
  source.subscribe((value) =>
    emissions.push({ at: Date.now() - startedAt, value })
  );
  return emissions;
}

describe('withDeferredSkeleton', () => {
  it('never shows the skeleton when the response beats the delay', fakeAsync(() => {
    const emissions = record(
      response(30).pipe(withDeferredSkeleton<State>('loading'))
    );

    tick(30);
    expect(emissions).toEqual([{ at: 30, value: 'ready' }]);

    // Past the delay threshold: the skeleton must not appear retroactively.
    tick(1000);
    expect(emissions.length).toBe(1);
  }));

  it('emits the value immediately when it lands just under the delay', fakeAsync(() => {
    const justUnder = DEFERRED_SKELETON_DELAY_MS - 1;
    const emissions = record(
      response(justUnder).pipe(withDeferredSkeleton<State>('loading'))
    );

    tick(justUnder);
    expect(emissions).toEqual([{ at: justUnder, value: 'ready' }]);

    tick(1000);
    expect(emissions.length).toBe(1);
  }));

  it('shows the skeleton once the request outruns the delay', fakeAsync(() => {
    const emissions = record(
      response(2000).pipe(withDeferredSkeleton<State>('loading'))
    );

    tick(DEFERRED_SKELETON_DELAY_MS);
    expect(emissions).toEqual([
      { at: DEFERRED_SKELETON_DELAY_MS, value: 'loading' },
    ]);

    tick(2000);
    expect(emissions[1]).toEqual({ at: 2000, value: 'ready' });
  }));

  it('holds a barely-late response for the full minimum dwell', fakeAsync(() => {
    // The case that makes the delay alone insufficient: without the dwell the
    // skeleton would be on screen for 10ms.
    const emissions = record(
      response(DEFERRED_SKELETON_DELAY_MS + 10).pipe(
        withDeferredSkeleton<State>('loading')
      )
    );

    tick(DEFERRED_SKELETON_DELAY_MS + 10);
    expect(emissions.map((e) => e.value)).toEqual(['loading']);

    tick(DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(emissions[1].at).toBe(
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS
    );
  }));

  it('does not delay a response that already outlasted the dwell', fakeAsync(() => {
    const slow =
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS + 500;
    const emissions = record(
      response(slow).pipe(withDeferredSkeleton<State>('loading'))
    );

    tick(slow);
    expect(emissions[1]).toEqual({ at: slow, value: 'ready' });
  }));

  it('subscribes to the source immediately rather than after the delay', fakeAsync(() => {
    let subscribedAt = -1;
    const startedAt = Date.now();
    const source = new Observable<State>((subscriber) => {
      subscribedAt = Date.now() - startedAt;
      subscriber.next('ready');
      subscriber.complete();
    });

    source.pipe(withDeferredSkeleton<State>('loading')).subscribe();

    expect(subscribedAt).toBe(0);
    tick(DEFERRED_SKELETON_DELAY_MS);
  }));

  it('unsubscribes from the source when the consumer unsubscribes', fakeAsync(() => {
    let torn = false;
    const source = new Observable<State>(() => () => (torn = true));

    const subscription = source
      .pipe(withDeferredSkeleton<State>('loading'))
      .subscribe();
    subscription.unsubscribe();

    expect(torn).toBeTrue();
  }));

  // The skeleton value is a transitional state with no way out on its own, so
  // emitting it as the LAST thing a signal consumer sees would strand the UI on
  // the loading state permanently.
  it('emits nothing when the source completes empty before the delay', fakeAsync(() => {
    const emissions = record(
      (EMPTY as Observable<State>).pipe(withDeferredSkeleton<State>('loading'))
    );

    tick(DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(emissions).toEqual([]);
  }));

  it('gives each subscription its own timers', fakeAsync(() => {
    const deferred = response(2000).pipe(
      withDeferredSkeleton<State>('loading')
    );

    const first = record(deferred);
    tick(2000);
    expect(first.map((e) => e.value)).toEqual(['loading', 'ready']);

    // A re-subscription (the switchMap-per-route-param case) must start over
    // rather than inherit the first run's elapsed time.
    const second = record(deferred);
    tick(50);
    expect(second).toEqual([]);
    tick(2000);
    expect(second.map((e) => e.value)).toEqual(['loading', 'ready']);
  }));
});

describe('DeferredSkeletonController', () => {
  let controller: DeferredSkeletonController;

  beforeEach(() => {
    controller = new DeferredSkeletonController();
  });

  afterEach(() => {
    controller.destroy();
  });

  it('stays hidden for a request that settles inside the delay', fakeAsync(() => {
    controller.start();
    tick(30);
    controller.stop();

    expect(controller.visible()).toBeFalse();

    tick(1000);
    expect(controller.visible()).toBeFalse();
  }));

  it('becomes visible once the delay elapses', fakeAsync(() => {
    controller.start();
    expect(controller.visible()).toBeFalse();

    tick(DEFERRED_SKELETON_DELAY_MS);
    expect(controller.visible()).toBeTrue();

    controller.stop();
    tick(DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(controller.visible()).toBeFalse();
  }));

  it('keeps a shown placeholder up for the minimum dwell', fakeAsync(() => {
    controller.start();
    tick(DEFERRED_SKELETON_DELAY_MS + 10);
    controller.stop();

    tick(DEFERRED_SKELETON_MIN_VISIBLE_MS - 11);
    expect(controller.visible()).toBeTrue();

    tick(1);
    expect(controller.visible()).toBeFalse();
  }));

  it('hides immediately when the dwell is already satisfied', fakeAsync(() => {
    controller.start();
    tick(DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS + 100);
    controller.stop();

    expect(controller.visible()).toBeFalse();
  }));

  // Without a pending count the first request to settle would schedule the
  // hide while the second was still running, and the second's stop() would
  // then no-op against an already-hidden indicator.
  it('keeps the placeholder up until the last overlapping request settles', fakeAsync(() => {
    controller.start();
    tick(DEFERRED_SKELETON_DELAY_MS);
    expect(controller.visible()).toBeTrue();

    controller.start();
    controller.stop();

    tick(DEFERRED_SKELETON_MIN_VISIBLE_MS * 2);
    expect(controller.visible()).toBeTrue();

    controller.stop();
    expect(controller.visible()).toBeFalse();
  }));

  it('does not restart the dwell when a second request overlaps the first', fakeAsync(() => {
    controller.start();
    tick(DEFERRED_SKELETON_DELAY_MS);
    tick(100);

    controller.start();
    controller.stop();
    controller.stop();

    // The dwell runs from when the placeholder appeared, not from the
    // overlapping start — 100ms of it is already spent.
    tick(DEFERRED_SKELETON_MIN_VISIBLE_MS - 100 - 1);
    expect(controller.visible()).toBeTrue();

    tick(1);
    expect(controller.visible()).toBeFalse();
  }));

  it('ignores a stop() that has no matching start()', fakeAsync(() => {
    controller.stop();
    controller.start();
    tick(DEFERRED_SKELETON_DELAY_MS);

    // The stray stop() must not have decremented the count into a state where
    // this request's own stop() is swallowed.
    expect(controller.visible()).toBeTrue();
    controller.stop();
    tick(DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(controller.visible()).toBeFalse();
  }));

  it('cancels a pending reveal when destroyed mid-request', fakeAsync(() => {
    controller.start();
    controller.destroy();

    tick(DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(controller.visible()).toBeFalse();
  }));
});
