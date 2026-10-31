import type { Mock, MockedObject } from 'vitest';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { CORDOVA_IOS_USER_AGENT, CORDOVA_USER_AGENT } from '../utils/platform';
import {
  NfcStatus,
  PrintLogNativeBridge,
  TagRead,
} from '../types/native-bridge';
import { ReaderConfig } from '../types/tag-reading';
import { FilamentService } from './filament.service';
import { LoggingService } from './logging.service';
import { TagReaderService } from './tag-reader.service';

/** A bridge with the NFC members, driven by the test the way native would drive it. */
class FakeNfcBridge {
  status: NfcStatus = 'ready';
  queued: TagRead | null = null;
  tagListeners: (() => void)[] = [];
  private nfcListeners: (() => void)[] = [];
  private readingListeners: (() => void)[] = [];

  readonly startTagReading = vi
    .fn()
    .mockImplementation(() => Promise.resolve(this.status));
  readonly stopTagReading = vi.fn().mockResolvedValue(undefined);
  readonly nfcStatus = vi
    .fn()
    .mockImplementation(() => Promise.resolve(this.status));
  readonly openNfcSettings = vi.fn().mockResolvedValue(undefined);

  consumeTag(): Promise<TagRead | null> {
    const tag = this.queued;
    this.queued = null;
    return Promise.resolve(tag);
  }

  onTag(listener: () => void): void {
    this.tagListeners.push(listener);
  }

  onTagReading(listener: () => void): void {
    this.readingListeners.push(listener);
  }

  /** Native sees a tag before its read finishes. */
  signalReading(): void {
    this.readingListeners.forEach((l) => l());
  }

  onNfcStatus(listener: () => void): void {
    this.nfcListeners.push(listener);
  }

  /** Native stores a tag and signals the page. */
  deliver(uid: string, tech: TagRead['tech'] = 'nfca'): void {
    this.queued = { uid, tech };
    this.tagListeners.forEach((l) => l());
  }

  signalNfcStatus(): void {
    this.nfcListeners.forEach((l) => l());
  }
}

/** Lets the bridge's promise chains settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

describe('TagReaderService', () => {
  let realUserAgent: PropertyDescriptor | undefined;
  let logging: MockedObject<LoggingService>;
  let filaments: MockedObject<FilamentService>;
  const config: ReaderConfig = {
    formats: [{ id: 'snapmaker', scheme: 'mifare-classic', params: {} }],
  };

  function pretendCordova(): void {
    Object.defineProperty(navigator, 'userAgent', {
      value: CORDOVA_USER_AGENT,
      configurable: true,
    });
  }

  function installBridge(nfc: FakeNfcBridge | null): void {
    window.PrintLogNative = {
      platform: 'android',
      appVersion: '1.3.0',
      pushPermission: 'default',
      requestPushPermission: () => Promise.resolve('default'),
      registerForPush: () => Promise.resolve({ ok: true }),
      unregisterForPush: () => Promise.resolve({ ok: true }),
      consumePendingTap: () => Promise.resolve(null),
      ...(nfc
        ? {
            nfcStatus: nfc.nfcStatus,
            startTagReading: nfc.startTagReading,
            stopTagReading: nfc.stopTagReading,
            consumeTag: () => nfc.consumeTag(),
            openNfcSettings: nfc.openNfcSettings,
            onTag: (l: () => void) => nfc.onTag(l),
            onTagReading: (l: () => void) => nfc.onTagReading(l),
            onNfcStatus: (l: () => void) => nfc.onNfcStatus(l),
          }
        : {}),
    } as PrintLogNativeBridge;
  }

  function create(): TagReaderService {
    return TestBed.inject(TagReaderService);
  }

  beforeEach(() => {
    realUserAgent = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'userAgent'
    );
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
    filaments = {
      getReaderConfig: vi.fn().mockName('FilamentService.getReaderConfig'),
    } as unknown as MockedObject<FilamentService>;
    filaments.getReaderConfig.mockImplementation(() => of(config));
    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: logging },
        { provide: FilamentService, useValue: filaments },
      ],
    });
    delete window.PrintLogNative;
  });

  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>)['userAgent'];
    if (realUserAgent) {
      Object.defineProperty(
        Object.getPrototypeOf(navigator),
        'userAgent',
        realUserAgent
      );
    }
    delete window.PrintLogNative;
    vi.useRealTimers();
  });

  it('is unavailable in an ordinary browser', () => {
    installBridge(new FakeNfcBridge());
    expect(create().available()).toBe(false);
  });

  it('is unavailable on an app shell without startTagReading', () => {
    pretendCordova();
    installBridge(null);
    expect(create().available()).toBe(false);
  });

  it('is available on an app shell that can read tags', async () => {
    pretendCordova();
    installBridge(new FakeNfcBridge());
    const service = create();
    await flush();
    expect(service.available()).toBe(true);
  });

  it('is unavailable on a phone without NFC, so no control shows that can never work', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    nfc.status = 'unsupported';
    installBridge(nfc);
    const service = create();
    await flush();
    expect(service.available()).toBe(false);
  });

  it('is available with NFC turned off, so the screen can offer Turn on', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    nfc.status = 'off';
    installBridge(nfc);
    const service = create();
    await flush();
    expect(service.available()).toBe(true);
    expect(service.status()).toBe('off');
  });

  it('starts reading once for two listeners and stops after the last unsubscribes', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const service = create();

    const a = service.listen().subscribe();
    const b = service.listen().subscribe();
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);

    a.unsubscribe();
    expect(nfc.stopTagReading).not.toHaveBeenCalled();

    b.unsubscribe();
    expect(nfc.stopTagReading).toHaveBeenCalledTimes(1);
  });

  it('emits a tag the bridge signals', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const reads: TagRead[] = [];
    create()
      .listen()
      .subscribe((r) => reads.push(r));

    nfc.deliver('04A23F11', 'nfcv');
    await flush();

    expect(reads).toEqual([{ uid: '04A23F11', tech: 'nfcv' }]);
    expect(logging.logEvent).toHaveBeenCalledWith('TagReader_Read', {
      tech: 'nfcv',
    });
  });

  it('drops the same UID within 2 seconds and emits it after', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0));
    const reads: string[] = [];
    create()
      .listen()
      .subscribe((r) => reads.push(r.uid));

    nfc.deliver('04A23F11');
    await flush();
    vi.advanceTimersByTime(1999);
    nfc.deliver('04A23F11');
    await flush();
    nfc.deliver('04B00000');
    await flush();
    vi.advanceTimersByTime(2001);
    nfc.deliver('04A23F11');
    await flush();

    expect(reads).toEqual(['04A23F11', '04B00000', '04A23F11']);
  });

  it('keeps dropping a UID that keeps coming back within 2 seconds of its last read', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0));
    const reads: string[] = [];
    create()
      .listen()
      .subscribe((r) => reads.push(r.uid));

    // A spool resting at the edge of the field drops out and back in.
    nfc.deliver('04A23F11');
    await flush();
    vi.advanceTimersByTime(1500);
    nfc.deliver('04A23F11');
    await flush();
    vi.advanceTimersByTime(1500);
    nfc.deliver('04A23F11');
    await flush();
    vi.advanceTimersByTime(2001);
    nfc.deliver('04A23F11');
    await flush();

    expect(reads).toEqual(['04A23F11', '04A23F11']);
  });

  it('forget lets the same UID through immediately', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const service = create();
    const reads: string[] = [];
    service.listen().subscribe((r) => reads.push(r.uid));

    nfc.deliver('04A23F11');
    await flush();
    service.forget('04A23F11');
    nfc.deliver('04A23F11');
    await flush();

    expect(reads).toEqual(['04A23F11', '04A23F11']);
  });

  it('sets status from startTagReading and from an NFC status signal', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    nfc.status = 'off';
    installBridge(nfc);
    const service = create();

    service.listen().subscribe();
    await flush();
    expect(service.status()).toBe('off');

    nfc.status = 'ready';
    nfc.signalNfcStatus();
    await flush();
    expect(service.status()).toBe('ready');
  });

  it('becomes available on printlog-native-ready and starts for a waiting listener', async () => {
    pretendCordova();
    const service = create();
    service.listen().subscribe();
    expect(service.available()).toBe(false);

    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    window.dispatchEvent(new Event('printlog-native-ready'));
    await flush();

    expect(service.available()).toBe(true);
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    nfc.deliver('04A23F11');
    await flush();
  });

  it('does not start reading when nobody is listening', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    create();
    await flush();
    expect(nfc.startTagReading).not.toHaveBeenCalled();
  });

  it('passes the reader config to startTagReading', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    create().listen().subscribe();
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledWith(config);
  });

  it('starts reading with null when the config call fails', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    filaments.getReaderConfig.mockReturnValue(
      throwError(() => new Error('offline'))
    );
    const service = create();
    service.listen().subscribe();
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledWith(null);
    expect(service.status()).toBe('ready');
  });

  it('starts reading with null when the config call throws', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    filaments.getReaderConfig.mockImplementation(() => {
      throw new Error('not wired');
    });
    const service = create();
    service.listen().subscribe();
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledWith(null);
    expect(service.status()).toBe('ready');
  });

  it('starts reading with null when the config never arrives', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    filaments.getReaderConfig.mockReturnValue(new Subject<ReaderConfig>());
    vi.useFakeTimers();
    create().listen().subscribe();
    await flush();
    expect(nfc.startTagReading).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5001);
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledWith(null);
  });

  it('fetches the config once per session', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const service = create();

    const first = service.listen().subscribe();
    await flush();
    first.unsubscribe();
    service.listen().subscribe();
    await flush();
    expect(filaments.getReaderConfig).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed config fetch', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    let calls = 0;
    const source: Observable<ReaderConfig> = new Observable((s) => {
      calls++;
      // The first call is the prefetch when the bridge appears, the second the first start.
      if (calls <= 2) {
        s.error(new Error('offline'));
      } else {
        s.next(config);
        s.complete();
      }
    });
    filaments.getReaderConfig.mockReturnValue(source);
    const service = create();

    const first = service.listen().subscribe();
    await flush();
    first.unsubscribe();
    service.listen().subscribe();
    await flush();

    expect(vi.mocked(nfc.startTagReading).mock.calls).toEqual([
      [null],
      [config],
    ]);
  });

  it('fetches the config as soon as the bridge is ready, before anyone listens', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const service = create();
    await flush();
    expect(filaments.getReaderConfig).toHaveBeenCalledTimes(1);

    service.listen().subscribe();
    await flush();
    expect(filaments.getReaderConfig).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledWith(config);
  });

  it('fetches the config when the bridge appears late', async () => {
    pretendCordova();
    create();
    expect(filaments.getReaderConfig).not.toHaveBeenCalled();

    installBridge(new FakeNfcBridge());
    window.dispatchEvent(new Event('printlog-native-ready'));
    await flush();

    expect(filaments.getReaderConfig).toHaveBeenCalledTimes(1);
  });

  it('does not wait again once a config wait has timed out', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    filaments.getReaderConfig.mockReturnValue(new Subject<ReaderConfig>());
    vi.useFakeTimers();
    const service = create();
    const first = service.listen().subscribe();
    await flush();
    vi.advanceTimersByTime(5001);
    await flush();
    first.unsubscribe();

    service.listen().subscribe();
    await flush();

    expect(vi.mocked(nfc.startTagReading).mock.calls).toEqual([[null], [null]]);
    expect(filaments.getReaderConfig).toHaveBeenCalledTimes(1);
  });

  it('a config that arrives after the wait timed out serves the next session', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const pending = new Subject<ReaderConfig>();
    filaments.getReaderConfig.mockReturnValue(pending);
    vi.useFakeTimers();
    const service = create();
    const first = service.listen().subscribe();
    await flush();
    vi.advanceTimersByTime(5001);
    await flush();
    first.unsubscribe();

    pending.next(config);
    pending.complete();
    service.listen().subscribe();
    await flush();

    expect(vi.mocked(nfc.startTagReading).mock.calls).toEqual([
      [null],
      [config],
    ]);
  });

  it('does not refetch the config for a second listener', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const service = create();
    service.listen().subscribe();
    service.listen().subscribe();
    await flush();
    expect(filaments.getReaderConfig).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
  });

  it('emits readingStarted when native reports a tag under the phone', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const service = create();
    let started = 0;
    service.readingStarted.subscribe(() => started++);
    await flush();
    nfc.signalReading();
    expect(started).toBe(1);
  });

  it('forwards the raw memory of a read', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const reads: TagRead[] = [];
    create()
      .listen()
      .subscribe((r) => reads.push(r));
    await flush();

    nfc.queued = {
      uid: '805BEC3E',
      tech: 'nfca',
      techs: ['nfca', 'mifareclassic'],
      memory: { kind: 'classic', data: 'AAEC', unreadable: [3] },
    };
    nfc.tagListeners.forEach((l) => l());
    await flush();

    expect(reads[0].memory).toEqual({
      kind: 'classic',
      data: 'AAEC',
      unreadable: [3],
    });
  });

  it('still works on an old bridge that ignores the config argument', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    // App 1.3.0: no onTagReading, startTagReading takes no parameters.
    const bridge = window.PrintLogNative as PrintLogNativeBridge;
    delete bridge.onTagReading;
    const legacyStart = vi.fn().mockResolvedValue('ready');
    bridge.startTagReading = () => legacyStart();
    const service = create();
    service.listen().subscribe();
    await flush();
    expect(legacyStart).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('ready');
  });

  it('starts native once when a listener leaves and returns while the config loads', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    const pending = new Subject<ReaderConfig>();
    filaments.getReaderConfig.mockReturnValue(pending);
    const service = create();

    service.listen().subscribe().unsubscribe();
    service.listen().subscribe();
    pending.next(config);
    pending.complete();
    await flush();

    expect(nfc.stopTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledWith(config);
  });

  it('starts native once when the bridge appears while a start is in flight', async () => {
    pretendCordova();
    const service = create();
    const pending = new Subject<ReaderConfig>();
    filaments.getReaderConfig.mockReturnValue(pending);
    service.listen().subscribe();

    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    window.dispatchEvent(new Event('printlog-native-ready'));
    window.dispatchEvent(new Event('printlog-native-ready'));
    service.listen().subscribe().unsubscribe();
    pending.next(config);
    pending.complete();
    await flush();

    expect(nfc.startTagReading).toHaveBeenCalledTimes(1);

    expect(nfc.startTagReading).toHaveBeenCalledWith(config);
  });

  it('the dev fake tag signals readingStarted before it delivers the read', () => {
    const service = create();
    const order: string[] = [];
    service.readingStarted.subscribe(() => order.push('started'));
    service.listen().subscribe(() => order.push('read'));
    window.__printlogFakeTag?.('04a23f11');
    expect(order).toEqual(['started', 'read']);
  });

  it('openSettings asks the bridge', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    await create().openSettings();
    expect(nfc.openNfcSettings).toHaveBeenCalled();
  });

  describe('in session mode (iOS)', () => {
    let scanTag: Mock;

    /** The Android bridge plus what the iOS shell adds: session mode and scanTag. */
    function installSessionBridge(nfc: FakeNfcBridge): void {
      Object.defineProperty(navigator, 'userAgent', {
        value: CORDOVA_IOS_USER_AGENT,
        configurable: true,
      });
      installBridge(nfc);
      scanTag = vi.fn().mockResolvedValue('ready');
      Object.assign(window.PrintLogNative!, {
        platform: 'ios',
        tagReadingMode: 'session',
        scanTag,
      });
    }

    it('reads on demand only on a session-mode shell', async () => {
      pretendCordova();
      installBridge(new FakeNfcBridge());
      const passive = create();
      await flush();
      expect(passive.scansOnDemand()).toBe(false);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggingService, useValue: logging },
          { provide: FilamentService, useValue: filaments },
        ],
      });
      installSessionBridge(new FakeNfcBridge());
      const session = create();
      await flush();
      expect(session.scansOnDemand()).toBe(true);
    });

    it('opens the scan sheet only after native has its session, however long the config takes', async () => {
      const nfc = new FakeNfcBridge();
      installSessionBridge(nfc);
      const config$ = new Subject<ReaderConfig>();
      filaments.getReaderConfig.mockReturnValue(config$);
      const service = create();
      await flush();

      const subscription = service.listen().subscribe();
      const scanned = service.scan();
      await flush();
      // Tapped while the config was still loading: native has no session yet.
      expect(nfc.startTagReading).not.toHaveBeenCalled();
      expect(scanTag).not.toHaveBeenCalled();

      config$.next(config);
      config$.complete();
      await scanned;

      expect(
        Math.min(...vi.mocked(nfc.startTagReading).mock.invocationCallOrder)
      ).toBeLessThan(Math.min(...vi.mocked(scanTag).mock.invocationCallOrder));
      expect(scanTag).toHaveBeenCalledTimes(1);
      subscription.unsubscribe();
    });

    it('does not scan with no screen listening', async () => {
      installSessionBridge(new FakeNfcBridge());
      const service = create();
      await flush();

      await service.scan();

      expect(scanTag).not.toHaveBeenCalled();
    });

    it('never asks a passive shell to scan', async () => {
      pretendCordova();
      const nfc = new FakeNfcBridge();
      installBridge(nfc);
      const scan = vi.fn().mockResolvedValue('ready');
      Object.assign(window.PrintLogNative!, { scanTag: scan });
      const service = create();
      await flush();
      const subscription = service.listen().subscribe();

      await service.scan();

      expect(scan).not.toHaveBeenCalled();
      subscription.unsubscribe();
    });

    it('delivers the scanned tag through listen() as usual', async () => {
      const nfc = new FakeNfcBridge();
      installSessionBridge(nfc);
      const service = create();
      await flush();
      const reads: TagRead[] = [];
      const subscription = service.listen().subscribe((r) => reads.push(r));
      await service.scan();

      nfc.deliver('04A23F11223344');
      await flush();

      expect(reads.map((r) => r.uid)).toEqual(['04A23F11223344']);
      subscription.unsubscribe();
    });
  });
});
