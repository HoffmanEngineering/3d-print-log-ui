import { WritableSignal } from '@angular/core';

/**
 * Writes `next` into `target` only when it differs element-by-element from the
 * value already there.
 *
 * Signals settle on `Object.is`, so a freshly built array is ALWAYS a change to
 * a signal even when it carries identical contents — and `[]` compared to `[]`
 * is the case that bites, because it is what an absent query parameter produces
 * on every single navigation. Anything reacting to the signal (a `toObservable`
 * feeding a refetch, an `effect`) then fires on writes that carry no new
 * information.
 *
 * Order is significant: these back user-visible filters, where a different
 * ordering is a different filter as far as the API request is concerned.
 */
export function setIfChanged<T>(
  target: WritableSignal<T[]>,
  next: T[]
): boolean {
  const current = target();

  if (
    current.length === next.length &&
    current.every((value, index) => Object.is(value, next[index]))
  ) {
    return false;
  }

  target.set(next);
  return true;
}
