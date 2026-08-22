import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import {
  NETWORK_INFORMATION,
  NetworkInformationLike,
  SelectivePreloadStrategy,
} from './selective-preload.strategy';

describe('SelectivePreloadStrategy', () => {
  const preloadable: Route = { path: 'prints', data: { preload: true } };

  function build(options: {
    connection?: NetworkInformationLike | null;
    platformId?: string;
  }): SelectivePreloadStrategy {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SelectivePreloadStrategy,
        { provide: NETWORK_INFORMATION, useValue: options.connection ?? null },
        { provide: PLATFORM_ID, useValue: options.platformId ?? 'browser' },
      ],
    });
    return TestBed.inject(SelectivePreloadStrategy);
  }

  /** A `load` spy that reports whether the chunk fetch was actually started. */
  function loader(): jasmine.Spy<() => Observable<unknown>> {
    return jasmine
      .createSpy('load')
      .and.returnValue(of('chunk')) as jasmine.Spy<() => Observable<unknown>>;
  }

  describe('route opt-in', () => {
    it('preloads a route flagged with data.preload', async () => {
      const strategy = build({});
      const load = loader();

      const result = await firstValue(strategy.preload(preloadable, load));

      expect(load).toHaveBeenCalledTimes(1);
      expect(result).toBe('chunk');
    });

    it('does not preload a route with no data block', async () => {
      const strategy = build({});
      const load = loader();

      const result = await firstValue(strategy.preload({ path: 'docs' }, load));

      expect(load).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('does not preload a route that opts out explicitly', async () => {
      const strategy = build({});
      const load = loader();

      await firstValue(
        strategy.preload({ path: 'docs', data: { preload: false } }, load)
      );

      expect(load).not.toHaveBeenCalled();
    });

    it('treats a non-boolean data.preload as opted out', async () => {
      const strategy = build({});
      const load = loader();

      await firstValue(
        strategy.preload(
          { path: 'docs', data: { preload: 'yes' } } as Route,
          load
        )
      );

      expect(load).not.toHaveBeenCalled();
    });
  });

  describe('network awareness', () => {
    it('skips preloading when the user has asked to save data', async () => {
      const strategy = build({ connection: { saveData: true } });
      const load = loader();

      await firstValue(strategy.preload(preloadable, load));

      expect(load).not.toHaveBeenCalled();
    });

    for (const effectiveType of ['slow-2g', '2g', '3g']) {
      it(`skips preloading on a ${effectiveType} connection`, async () => {
        const strategy = build({ connection: { effectiveType } });
        const load = loader();

        await firstValue(strategy.preload(preloadable, load));

        expect(load).not.toHaveBeenCalled();
      });
    }

    it('preloads on a 4g connection', async () => {
      const strategy = build({ connection: { effectiveType: '4g' } });
      const load = loader();

      await firstValue(strategy.preload(preloadable, load));

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('preloads when the Network Information API is unavailable', async () => {
      // Safari and Firefox do not implement navigator.connection. Absence of
      // the signal must not be read as a constrained connection.
      const strategy = build({ connection: null });
      const load = loader();

      await firstValue(strategy.preload(preloadable, load));

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('preloads when saveData is explicitly false', async () => {
      const strategy = build({
        connection: { saveData: false, effectiveType: '4g' },
      });
      const load = loader();

      await firstValue(strategy.preload(preloadable, load));

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('respects connection changes made in place after construction', async () => {
      // navigator.connection is a stable object whose properties update as the
      // radio changes. A strategy that snapshotted saveData or effectiveType at
      // construction would keep preloading after the user turns data saver on
      // mid-session.
      const connection: NetworkInformationLike = { effectiveType: '4g' };
      const strategy = build({ connection });

      const first = loader();
      await firstValue(strategy.preload(preloadable, first));
      expect(first).toHaveBeenCalledTimes(1);

      connection.effectiveType = '2g';

      const second = loader();
      await firstValue(strategy.preload(preloadable, second));
      expect(second).not.toHaveBeenCalled();
    });
  });

  describe('resilience', () => {
    it('recovers when a chunk fails to load', async () => {
      // RouterPreloader subscribes without an error handler, so an error that
      // escapes here tears down the subscription and no route preloads again
      // for the rest of the session. Angular's own PreloadAllModules guards
      // against this with catchError; so must we.
      const strategy = build({});
      const load = jasmine
        .createSpy('load')
        .and.returnValue(throwError(() => new Error('chunk 404')));

      const result = await firstValue(strategy.preload(preloadable, load));

      expect(result).toBeNull();
    });

    it('recovers when the loader throws synchronously', async () => {
      const strategy = build({});
      const load = jasmine.createSpy('load').and.throwError('boom');

      const result = await firstValue(strategy.preload(preloadable, load));

      expect(result).toBeNull();
    });

    it('keeps preloading later routes after one has failed', async () => {
      const strategy = build({});
      const failing = jasmine
        .createSpy('load')
        .and.returnValue(throwError(() => new Error('chunk 404')));
      await firstValue(strategy.preload(preloadable, failing));

      const next = loader();
      const result = await firstValue(strategy.preload(preloadable, next));

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toBe('chunk');
    });
  });

  describe('server-side rendering', () => {
    it('never preloads during prerender, even for a flagged route', async () => {
      // Prerendering runs the router in Node, where fetching a lazy chunk buys
      // nothing and `navigator` does not exist.
      const strategy = build({ platformId: 'server' });
      const load = loader();

      const result = await firstValue(strategy.preload(preloadable, load));

      expect(load).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});

/** Resolves the first emission of an observable that is expected to complete. */
function firstValue<T>(source: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    source.subscribe({ next: resolve, error: reject });
  });
}
