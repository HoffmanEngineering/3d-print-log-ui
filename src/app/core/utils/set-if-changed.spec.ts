import { signal } from '@angular/core';
import { setIfChanged } from './set-if-changed';

describe('setIfChanged', () => {
  it('does not write an equal array, so dependents do not re-run', () => {
    const target = signal<number[]>([1, 2]);
    const before = target();

    expect(setIfChanged(target, [1, 2])).toBeFalse();
    // Identity is the point: a signal settles on Object.is, so holding the
    // original instance is what stops a toObservable from emitting.
    expect(target()).toBe(before);
  });

  it('treats two empty arrays as equal', () => {
    const target = signal<string[]>([]);
    const before = target();

    expect(setIfChanged(target, [])).toBeFalse();
    expect(target()).toBe(before);
  });

  it('writes when the contents differ', () => {
    const target = signal<number[]>([1, 2]);

    expect(setIfChanged(target, [1, 3])).toBeTrue();
    expect(target()).toEqual([1, 3]);
  });

  it('writes when the length differs', () => {
    const target = signal<number[]>([1]);

    expect(setIfChanged(target, [1, 2])).toBeTrue();
    expect(target()).toEqual([1, 2]);
  });

  // A reordered filter is a different request, so it must not be swallowed.
  it('writes when only the order differs', () => {
    const target = signal<number[]>([1, 2]);

    expect(setIfChanged(target, [2, 1])).toBeTrue();
    expect(target()).toEqual([2, 1]);
  });
});
