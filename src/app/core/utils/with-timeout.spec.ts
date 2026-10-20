import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  it('resolves to the work when it settles first', async () => {
    expect(await withTimeout(Promise.resolve(1), 0, 1000)).toBe(1);
  });

  it('resolves to the fallback once the time is up', fakeAsync(() => {
    let result: number | undefined;
    void withTimeout(new Promise<number>(() => {}), 0, 3000).then(
      (v) => (result = v)
    );
    tick(2999);
    flushMicrotasks();
    expect(result).toBeUndefined();
    tick(1);
    flushMicrotasks();
    expect(result).toBe(0);
  }));

  it('passes a rejection through', async () => {
    await expectAsync(
      withTimeout(Promise.reject(new Error('boom')), 0, 1000)
    ).toBeRejectedWithError('boom');
  });
});
