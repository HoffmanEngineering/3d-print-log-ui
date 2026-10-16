import { Observable, Subject, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { CORDOVA_USER_AGENT } from '../utils/platform';
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

  readonly startTagReading = jasmine
    .createSpy('startTagReading')
    .and.callFake(() => Promise.resolve(this.status));
  readonly stopTagReading = jasmine
    .createSpy('stopTagReading')
    .and.resolveTo(undefined);
  readonly nfcStatus = jasmine
    .createSpy('nfcStatus')
    .and.callFake(() => Promise.resolve(this.status));
  readonly openNfcSettings = jasmine
    .createSpy('openNfcSettings')
    .and.resolveTo(undefined);

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
  let logging: jasmine.SpyObj<LoggingService>;
  let filaments: jasmine.SpyObj<FilamentService>;
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
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getReaderConfig',
    ]);
    filaments.getReaderConfig.and.callFake(() => of(config));
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
    jasmine.clock().uninstall();
  });

  it('is unavailable in an ordinary browser', () => {
    installBridge(new FakeNfcBridge());
    expect(create().available()).toBeFalse();
  });

  it('is unavailable on an app shell without startTagReading', () => {
    pretendCordova();
    installBridge(null);
    expect(create().available()).toBeFalse();
  });

  it('is available on an app shell that can read tags', async () => {
    pretendCordova();
    installBridge(new FakeNfcBridge());
    const service = create();
    await flush();
    expect(service.available()).toBeTrue();
  });

  it('is unavailable on a phone without NFC, so no control shows that can never work', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    nfc.status = 'unsupported';
    installBridge(nfc);
    const service = create();
    await flush();
    expect(service.available()).toBeFalse();
  });

  it('is available with NFC turned off, so the screen can offer Turn on', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    nfc.status = 'off';
    installBridge(nfc);
    const service = create();
    await flush();
    expect(service.available()).toBeTrue();
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
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 15, 12, 0, 0));
    const reads: string[] = [];
    create()
      .listen()
      .subscribe((r) => reads.push(r.uid));

    nfc.deliver('04A23F11');
    await flush();
    jasmine.clock().tick(1999);
    nfc.deliver('04A23F11');
    await flush();
    nfc.deliver('04B00000');
    await flush();
    jasmine.clock().tick(2001);
    nfc.deliver('04A23F11');
    await flush();

    expect(reads).toEqual(['04A23F11', '04B00000', '04A23F11']);
  });

  it('keeps dropping a UID that keeps coming back within 2 seconds of its last read', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 15, 12, 0, 0));
    const reads: string[] = [];
    create()
      .listen()
      .subscribe((r) => reads.push(r.uid));

    // A spool resting at the edge of the field drops out and back in.
    nfc.deliver('04A23F11');
    await flush();
    jasmine.clock().tick(1500);
    nfc.deliver('04A23F11');
    await flush();
    jasmine.clock().tick(1500);
    nfc.deliver('04A23F11');
    await flush();
    jasmine.clock().tick(2001);
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
    expect(service.available()).toBeFalse();

    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    window.dispatchEvent(new Event('printlog-native-ready'));
    await flush();

    expect(service.available()).toBeTrue();
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
    expect(nfc.startTagReading).toHaveBeenCalledOnceWith(config);
  });

  it('starts reading with null when the config call fails', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    filaments.getReaderConfig.and.returnValue(
      throwError(() => new Error('offline'))
    );
    const service = create();
    service.listen().subscribe();
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledOnceWith(null);
    expect(service.status()).toBe('ready');
  });

  it('starts reading with null when the config never arrives', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    filaments.getReaderConfig.and.returnValue(new Subject<ReaderConfig>());
    jasmine.clock().install();
    create().listen().subscribe();
    await flush();
    expect(nfc.startTagReading).not.toHaveBeenCalled();
    jasmine.clock().tick(5001);
    await flush();
    expect(nfc.startTagReading).toHaveBeenCalledOnceWith(null);
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
      if (calls === 1) {
        s.error(new Error('offline'));
      } else {
        s.next(config);
        s.complete();
      }
    });
    filaments.getReaderConfig.and.returnValue(source);
    const service = create();

    const first = service.listen().subscribe();
    await flush();
    first.unsubscribe();
    service.listen().subscribe();
    await flush();

    expect(nfc.startTagReading.calls.allArgs()).toEqual([[null], [config]]);
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
    const legacyStart = jasmine.createSpy('start').and.resolveTo('ready');
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
    filaments.getReaderConfig.and.returnValue(pending);
    const service = create();

    service.listen().subscribe().unsubscribe();
    service.listen().subscribe();
    pending.next(config);
    pending.complete();
    await flush();

    expect(nfc.stopTagReading).toHaveBeenCalledTimes(1);
    expect(nfc.startTagReading).toHaveBeenCalledOnceWith(config);
  });

  it('starts native once when the bridge appears while a start is in flight', async () => {
    pretendCordova();
    const service = create();
    const pending = new Subject<ReaderConfig>();
    filaments.getReaderConfig.and.returnValue(pending);
    service.listen().subscribe();

    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    window.dispatchEvent(new Event('printlog-native-ready'));
    window.dispatchEvent(new Event('printlog-native-ready'));
    service.listen().subscribe().unsubscribe();
    pending.next(config);
    pending.complete();
    await flush();

    expect(nfc.startTagReading).toHaveBeenCalledOnceWith(config);
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
});
