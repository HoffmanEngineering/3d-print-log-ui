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
function record(source: Observable<State>): {
  at: number;
  value: State;
}[] {
  const emissions: {
    at: number;
    value: State;
  }[] = [];
  const startedAt = Date.now();
  source.subscribe((value) =>
    emissions.push({ at: Date.now() - startedAt, value })
  );
  return emissions;
}

describe('withDeferredSkeleton', () => {
  it('never shows the skeleton when the response beats the delay', async () => {
    vi.useFakeTimers();
    const emissions = record(
      response(30).pipe(withDeferredSkeleton<State>('loading'))
    );

    await vi.advanceTimersByTimeAsync(30);
    expect(emissions).toEqual([{ at: 30, value: 'ready' }]);

    // Past the delay threshold: the skeleton must not appear retroactively.
    await vi.advanceTimersByTimeAsync(1000);
    expect(emissions.length).toBe(1);
  });

  it('emits the value immediately when it lands just under the delay', async () => {
    vi.useFakeTimers();
    const justUnder = DEFERRED_SKELETON_DELAY_MS - 1;
    const emissions = record(
      response(justUnder).pipe(withDeferredSkeleton<State>('loading'))
    );

    await vi.advanceTimersByTimeAsync(justUnder);
    expect(emissions).toEqual([{ at: justUnder, value: 'ready' }]);

    await vi.advanceTimersByTimeAsync(1000);
    expect(emissions.length).toBe(1);
  });

  it('shows the skeleton once the request outruns the delay', async () => {
    vi.useFakeTimers();
    const emissions = record(
      response(2000).pipe(withDeferredSkeleton<State>('loading'))
    );

    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS);
    expect(emissions).toEqual([
      { at: DEFERRED_SKELETON_DELAY_MS, value: 'loading' },
    ]);

    await vi.advanceTimersByTimeAsync(2000);
    expect(emissions[1]).toEqual({ at: 2000, value: 'ready' });
  });

  it('holds a barely-late response for the full minimum dwell', async () => {
    vi.useFakeTimers();
    // The case that makes the delay alone insufficient: without the dwell the
    // skeleton would be on screen for 10ms.
    const emissions = record(
      response(DEFERRED_SKELETON_DELAY_MS + 10).pipe(
        withDeferredSkeleton<State>('loading')
      )
    );

    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS + 10);
    expect(emissions.map((e) => e.value)).toEqual(['loading']);

    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(emissions[1].at).toBe(
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS
    );
  });

  it('does not delay a response that already outlasted the dwell', async () => {
    vi.useFakeTimers();
    const slow =
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS + 500;
    const emissions = record(
      response(slow).pipe(withDeferredSkeleton<State>('loading'))
    );

    await vi.advanceTimersByTimeAsync(slow);
    expect(emissions[1]).toEqual({ at: slow, value: 'ready' });
  });

  it('subscribes to the source immediately rather than after the delay', async () => {
    vi.useFakeTimers();
    let subscribedAt = -1;
    const startedAt = Date.now();
    const source = new Observable<State>((subscriber) => {
      subscribedAt = Date.now() - startedAt;
      subscriber.next('ready');
      subscriber.complete();
    });

    source.pipe(withDeferredSkeleton<State>('loading')).subscribe();

    expect(subscribedAt).toBe(0);
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS);
  });

  it('unsubscribes from the source when the consumer unsubscribes', async () => {
    vi.useFakeTimers();
    let torn = false;
    const source = new Observable<State>(() => () => (torn = true));

    const subscription = source
      .pipe(withDeferredSkeleton<State>('loading'))
      .subscribe();
    subscription.unsubscribe();

    expect(torn).toBe(true);
  });

  // The skeleton value is a transitional state with no way out on its own, so
  // emitting it as the LAST thing a signal consumer sees would strand the UI on
  // the loading state permanently.
  it('emits nothing when the source completes empty before the delay', async () => {
    vi.useFakeTimers();
    const emissions = record(
      (EMPTY as Observable<State>).pipe(withDeferredSkeleton<State>('loading'))
    );

    await vi.advanceTimersByTimeAsync(
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS
    );
    expect(emissions).toEqual([]);
  });

  it('gives each subscription its own timers', async () => {
    vi.useFakeTimers();
    const deferred = response(2000).pipe(
      withDeferredSkeleton<State>('loading')
    );

    const first = record(deferred);
    await vi.advanceTimersByTimeAsync(2000);
    expect(first.map((e) => e.value)).toEqual(['loading', 'ready']);

    // A re-subscription (the switchMap-per-route-param case) must start over
    // rather than inherit the first run's elapsed time.
    const second = record(deferred);
    await vi.advanceTimersByTimeAsync(50);
    expect(second).toEqual([]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(second.map((e) => e.value)).toEqual(['loading', 'ready']);
  });
});

describe('DeferredSkeletonController', () => {
  let controller: DeferredSkeletonController;

  beforeEach(() => {
    controller = new DeferredSkeletonController();
  });

  afterEach(() => {
    controller.destroy();
  });

  it('stays hidden for a request that settles inside the delay', async () => {
    vi.useFakeTimers();
    controller.start();
    await vi.advanceTimersByTimeAsync(30);
    controller.stop();

    expect(controller.visible()).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    expect(controller.visible()).toBe(false);
  });

  it('becomes visible once the delay elapses', async () => {
    vi.useFakeTimers();
    controller.start();
    expect(controller.visible()).toBe(false);

    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS);
    expect(controller.visible()).toBe(true);

    controller.stop();
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(controller.visible()).toBe(false);
  });

  it('keeps a shown placeholder up for the minimum dwell', async () => {
    vi.useFakeTimers();
    controller.start();
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS + 10);
    controller.stop();

    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_MIN_VISIBLE_MS - 11);
    expect(controller.visible()).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(controller.visible()).toBe(false);
  });

  it('hides immediately when the dwell is already satisfied', async () => {
    vi.useFakeTimers();
    controller.start();
    await vi.advanceTimersByTimeAsync(
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS + 100
    );
    controller.stop();

    expect(controller.visible()).toBe(false);
  });

  // Without a pending count the first request to settle would schedule the
  // hide while the second was still running, and the second's stop() would
  // then no-op against an already-hidden indicator.
  it('keeps the placeholder up until the last overlapping request settles', async () => {
    vi.useFakeTimers();
    controller.start();
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS);
    expect(controller.visible()).toBe(true);

    controller.start();
    controller.stop();

    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_MIN_VISIBLE_MS * 2);
    expect(controller.visible()).toBe(true);

    controller.stop();
    expect(controller.visible()).toBe(false);
  });

  it('does not restart the dwell when a second request overlaps the first', async () => {
    vi.useFakeTimers();
    controller.start();
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS);
    await vi.advanceTimersByTimeAsync(100);

    controller.start();
    controller.stop();
    controller.stop();

    // The dwell runs from when the placeholder appeared, not from the
    // overlapping start — 100ms of it is already spent.
    await vi.advanceTimersByTimeAsync(
      DEFERRED_SKELETON_MIN_VISIBLE_MS - 100 - 1
    );
    expect(controller.visible()).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(controller.visible()).toBe(false);
  });

  it('ignores a stop() that has no matching start()', async () => {
    vi.useFakeTimers();
    controller.stop();
    controller.start();
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_DELAY_MS);

    // The stray stop() must not have decremented the count into a state where
    // this request's own stop() is swallowed.
    expect(controller.visible()).toBe(true);
    controller.stop();
    await vi.advanceTimersByTimeAsync(DEFERRED_SKELETON_MIN_VISIBLE_MS);
    expect(controller.visible()).toBe(false);
  });

  it('cancels a pending reveal when destroyed mid-request', async () => {
    vi.useFakeTimers();
    controller.start();
    controller.destroy();

    await vi.advanceTimersByTimeAsync(
      DEFERRED_SKELETON_DELAY_MS + DEFERRED_SKELETON_MIN_VISIBLE_MS
    );
    expect(controller.visible()).toBe(false);
  });
});
