import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  it('resolves to the work when it settles first', async () => {
    expect(await withTimeout(Promise.resolve(1), 0, 1000)).toBe(1);
  });

  it('resolves to the fallback once the time is up', async () => {
    vi.useFakeTimers();
    let result: number | undefined;
    void withTimeout(new Promise<number>(() => {}), 0, 3000).then(
      (v) => (result = v)
    );
    await vi.advanceTimersByTimeAsync(2999);
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(0);
  });

  it('passes a rejection through', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 0, 1000)
    ).rejects.toThrowError('boom');
  });
});
