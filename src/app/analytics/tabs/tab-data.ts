import { Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  debounceTime,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ChartState } from 'src/app/shared/charts/chart-frame.component';
import { AnalyticsFilterValue } from '../models/analytics.models';

export interface TabData<T> {
  readonly data: Signal<T | null>;
  readonly state: Signal<ChartState>;
  retry(): void;
}

/**
 * The request hygiene every analytics tab needs, written once.
 *
 * The outer switchMap is load-bearing twice over: it cancels the in-flight request when the
 * filter changes, AND it guarantees a late response from a superseded request can never be
 * applied over a newer one. Replacing it with mergeMap or a manual subscription reintroduces
 * exactly the bug the spec calls out. Errors fail the WHOLE tab (spec §6.3) — the per-tab
 * endpoint choice means individual widgets do not fail independently.
 *
 * Must be called in an injection context (a component constructor or field initializer),
 * because it uses takeUntilDestroyed.
 */
export function createTabData<T>(
  filter: Signal<AnalyticsFilterValue>,
  load: (filter: AnalyticsFilterValue) => Observable<T>,
  isEmpty: (response: T) => boolean
): TabData<T> {
  const data = signal<T | null>(null);
  const state = signal<ChartState>('loading');
  const retry$ = new Subject<void>();

  toObservable(filter)
    .pipe(
      debounceTime(250),
      switchMap((current) =>
        merge(of(current), retry$.pipe(map(() => current)))
      ),
      tap(() => state.set('loading')),
      switchMap((current) =>
        load(current).pipe(
          catchError(() => {
            state.set('error');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed()
    )
    .subscribe((response) => {
      data.set(response);
      state.set(isEmpty(response) ? 'empty' : 'ready');
    });

  return {
    data: data.asReadonly(),
    state: state.asReadonly(),
    retry: () => retry$.next(),
  };
}
