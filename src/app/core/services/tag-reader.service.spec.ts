import { TestBed } from '@angular/core/testing';
import { CORDOVA_USER_AGENT } from '../utils/platform';
import {
  NfcStatus,
  PrintLogNativeBridge,
  TagRead,
} from '../types/native-bridge';
import { LoggingService } from './logging.service';
import { TagReaderService } from './tag-reader.service';

/** A bridge with the NFC members, driven by the test the way native would drive it. */
class FakeNfcBridge {
  status: NfcStatus = 'ready';
  queued: TagRead | null = null;
  private tagListeners: (() => void)[] = [];
  private nfcListeners: (() => void)[] = [];

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
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('TagReaderService', () => {
  let realUserAgent: PropertyDescriptor | undefined;
  let logging: jasmine.SpyObj<LoggingService>;

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
    TestBed.configureTestingModule({
      providers: [{ provide: LoggingService, useValue: logging }],
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

  it('openSettings asks the bridge', async () => {
    pretendCordova();
    const nfc = new FakeNfcBridge();
    installBridge(nfc);
    await create().openSettings();
    expect(nfc.openNfcSettings).toHaveBeenCalled();
  });
});
