import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { provideAppRouter } from '../../app.routes';
import { LoggingService } from '../services/logging.service';
import {
  CHUNK_RELOAD_KEY,
  ChunkLoadRecoveryService,
  isChunkLoadError,
} from './chunk-load-recovery';

@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: '' })
class PageComponent {}

/** Chrome, Safari and webpack's wording for a lazy chunk that no longer exists. */
const CHROME = new TypeError(
  'Failed to fetch dynamically imported module: https://www.3dprintlog.com/chunk-ABC123.js'
);
const SAFARI = new TypeError('Importing a module script failed.');
const WEBPACK = Object.assign(new Error('Loading chunk 12 failed.'), {
  name: 'ChunkLoadError',
});

describe('isChunkLoadError', () => {
  it.each([
    ['Chrome', CHROME],
    ['Safari', SAFARI],
    ['webpack', WEBPACK],
  ])('recognizes the %s wording', (_, error) => {
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('recognizes a chunk error wrapped as a promise rejection', () => {
    expect(isChunkLoadError({ rejection: CHROME })).toBe(true);
  });

  it('recognizes a bare message string', () => {
    expect(isChunkLoadError(CHROME.message)).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('ChunkLoadRecoveryService', () => {
  let service: ChunkLoadRecoveryService;
  let reload: ReturnType<typeof vi.fn>;
  let logEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    logEvent = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: LoggingService, useValue: { logEvent } }],
    });
    service = TestBed.inject(ChunkLoadRecoveryService);
    reload = vi.fn();
    (service as unknown as { reload: unknown }).reload = reload;
  });

  afterEach(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  });

  it('reloads to the target URL on a chunk load error', () => {
    expect(service.recover(CHROME, '/prints/42')).toBe(true);

    expect(reload).toHaveBeenCalledExactlyOnceWith('/prints/42');
    expect(logEvent).toHaveBeenCalledWith('App_ChunkLoadReload', {
      target: '/prints/42',
    });
  });

  it('does nothing for an ordinary error', () => {
    expect(service.recover(new Error('boom'), '/prints/42')).toBe(false);

    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });

  // A reload that did not fix it means the chunk really is gone (or the network
  // is): reloading again would loop.
  it('reloads only once within a minute', () => {
    service.recover(CHROME, '/prints/42');
    expect(service.recover(CHROME, '/prints/42')).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again after the guard window has passed', () => {
    sessionStorage.setItem(
      CHUNK_RELOAD_KEY,
      String(Date.now() - 2 * 60 * 1000)
    );

    expect(service.recover(SAFARI)).toBe(true);
    expect(reload).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe('router navigation error handler', () => {
  let recover: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    recover = vi.fn().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideAppRouter([
          { path: '', component: PageComponent },
          {
            path: 'lazy',
            loadComponent: () => Promise.reject(CHROME),
          },
        ]),
        { provide: ChunkLoadRecoveryService, useValue: { recover } },
      ],
    });
  });

  it('hands a failed lazy load to chunk recovery with the target URL', async () => {
    await TestBed.inject(Router)
      .navigateByUrl('/lazy?tab=2')
      .catch(() => undefined);

    expect(recover).toHaveBeenCalledExactlyOnceWith(CHROME, '/lazy?tab=2');
  });
});
