import { TestBed } from '@angular/core/testing';
import { NativeBridgeService } from './native-bridge.service';
import { CORDOVA_USER_AGENT } from '../utils/platform';
import { PrintLogNativeBridge } from '../types/native-bridge';

describe('NativeBridgeService', () => {
  let service: NativeBridgeService;
  let realUserAgent: PropertyDescriptor | undefined;

  /**
   * The platform check reads navigator.userAgent, so the app shell has to be simulated at
   * the source rather than by stubbing the check — that is the very thing under test.
   */
  function pretendCordova(): void {
    Object.defineProperty(navigator, 'userAgent', {
      value: CORDOVA_USER_AGENT,
      configurable: true,
    });
  }

  beforeEach(() => {
    realUserAgent = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'userAgent'
    );
    TestBed.configureTestingModule({});
    service = TestBed.inject(NativeBridgeService);
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
  });

  it('reports unavailable in an ordinary browser', () => {
    expect(service.isAvailable()).toBeFalse();
  });

  it('reports unavailable in the app shell before native finishes injecting', () => {
    pretendCordova();
    expect(service.isAvailable()).toBeFalse();
  });

  it('returns null from consumePendingTap when unavailable', async () => {
    await expectAsync(service.consumePendingTap()).toBeResolvedTo(null);
  });

  it('delegates registerForPush to the native bridge', async () => {
    pretendCordova();
    const registerForPush = jasmine
      .createSpy('registerForPush')
      .and.resolveTo({ ok: true });
    window.PrintLogNative = {
      registerForPush,
    } as unknown as PrintLogNativeBridge;

    const result = await service.registerForPush('bearer-abc');

    expect(registerForPush).toHaveBeenCalledWith('bearer-abc');
    expect(result).toBeTrue();
  });

  it('resolves false when the native call rejects', async () => {
    pretendCordova();
    window.PrintLogNative = {
      registerForPush: () => Promise.reject(new Error('native failure')),
    } as unknown as PrintLogNativeBridge;

    await expectAsync(service.registerForPush('bearer-abc')).toBeResolvedTo(
      false
    );
  });

  it('does not call native at all in an ordinary browser', async () => {
    const registerForPush = jasmine
      .createSpy('registerForPush')
      .and.resolveTo({ ok: true });
    window.PrintLogNative = {
      registerForPush,
    } as unknown as PrintLogNativeBridge;

    await expectAsync(service.registerForPush('bearer-abc')).toBeResolvedTo(
      false
    );
    expect(registerForPush).not.toHaveBeenCalled();
  });

  describe('NFC tags', () => {
    it('cannot read tags without startTagReading on the bridge', () => {
      pretendCordova();
      window.PrintLogNative = {
        consumePendingTap: () => Promise.resolve(null),
      } as unknown as PrintLogNativeBridge;
      expect(service.canReadTags()).toBeFalse();
    });

    it('can read tags when the bridge has startTagReading', () => {
      pretendCordova();
      window.PrintLogNative = {
        startTagReading: () => Promise.resolve('ready'),
      } as unknown as PrintLogNativeBridge;
      expect(service.canReadTags()).toBeTrue();
    });

    it('resolves unsupported when startTagReading throws', async () => {
      pretendCordova();
      window.PrintLogNative = {
        startTagReading: () => Promise.reject(new Error('native')),
      } as unknown as PrintLogNativeBridge;
      await expectAsync(service.startTagReading(null)).toBeResolvedTo(
        'unsupported'
      );
    });

    it('passes the reader config to startTagReading', async () => {
      pretendCordova();
      const start = jasmine.createSpy('start').and.resolveTo('ready');
      window.PrintLogNative = {
        startTagReading: start,
      } as unknown as PrintLogNativeBridge;
      const config = {
        formats: [{ id: 'snapmaker', scheme: 's', params: {} }],
      };
      await service.startTagReading(config);
      expect(start).toHaveBeenCalledWith(config);
    });

    it('reports that onTagReading is not wired on an older shell', () => {
      pretendCordova();
      window.PrintLogNative = {} as PrintLogNativeBridge;
      expect(service.onTagReading(() => {})).toBeFalse();
    });

    it('wires onTagReading when the bridge has it', () => {
      pretendCordova();
      const onTagReading = jasmine.createSpy('onTagReading');
      window.PrintLogNative = {
        onTagReading,
      } as unknown as PrintLogNativeBridge;
      const listener = () => {};
      expect(service.onTagReading(listener)).toBeTrue();
      expect(onTagReading).toHaveBeenCalledWith(listener);
    });

    it('resolves null from consumeTag in an ordinary browser', async () => {
      await expectAsync(service.consumeTag()).toBeResolvedTo(null);
    });

    it('reports that onTag is not wired on an older shell', () => {
      pretendCordova();
      window.PrintLogNative = {} as PrintLogNativeBridge;
      expect(service.onTag(() => {})).toBeFalse();
    });
  });
});
