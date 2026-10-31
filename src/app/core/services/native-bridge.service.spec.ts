import { TestBed } from '@angular/core/testing';
import { NativeBridgeService } from './native-bridge.service';
import { CORDOVA_IOS_USER_AGENT, CORDOVA_USER_AGENT } from '../utils/platform';
import { PrintLogNativeBridge } from '../types/native-bridge';

describe('NativeBridgeService', () => {
  let service: NativeBridgeService;
  let realUserAgent: PropertyDescriptor | undefined;

  /**
   * The platform check reads navigator.userAgent, so the app shell has to be simulated at
   * the source rather than by stubbing the check — that is the very thing under test.
   */
  function pretendCordova(userAgent = CORDOVA_USER_AGENT): void {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
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
    expect(service.isAvailable()).toBe(false);
  });

  it('reports unavailable in the app shell before native finishes injecting', () => {
    pretendCordova();
    expect(service.isAvailable()).toBe(false);
  });

  it('delegates to the bridge in the iOS app shell too', async () => {
    pretendCordova(CORDOVA_IOS_USER_AGENT);
    const registerForPush = vi.fn().mockResolvedValue({ ok: true });
    window.PrintLogNative = {
      registerForPush,
    } as unknown as PrintLogNativeBridge;

    expect(service.isAvailable()).toBe(true);
    await expect(service.registerForPush('bearer-abc')).resolves.toEqual(true);
  });

  it('returns null from consumePendingTap when unavailable', async () => {
    await expect(service.consumePendingTap()).resolves.toEqual(null);
  });

  it('delegates registerForPush to the native bridge', async () => {
    pretendCordova();
    const registerForPush = vi.fn().mockResolvedValue({ ok: true });
    window.PrintLogNative = {
      registerForPush,
    } as unknown as PrintLogNativeBridge;

    const result = await service.registerForPush('bearer-abc');

    expect(registerForPush).toHaveBeenCalledWith('bearer-abc');
    expect(result).toBe(true);
  });

  it('resolves false when the native call rejects', async () => {
    pretendCordova();
    window.PrintLogNative = {
      registerForPush: () => Promise.reject(new Error('native failure')),
    } as unknown as PrintLogNativeBridge;

    await expect(service.registerForPush('bearer-abc')).resolves.toEqual(false);
  });

  it('does not call native at all in an ordinary browser', async () => {
    const registerForPush = vi.fn().mockResolvedValue({ ok: true });
    window.PrintLogNative = {
      registerForPush,
    } as unknown as PrintLogNativeBridge;

    await expect(service.registerForPush('bearer-abc')).resolves.toEqual(false);
    expect(registerForPush).not.toHaveBeenCalled();
  });

  describe('NFC tags', () => {
    it('cannot read tags without startTagReading on the bridge', () => {
      pretendCordova();
      window.PrintLogNative = {
        consumePendingTap: () => Promise.resolve(null),
      } as unknown as PrintLogNativeBridge;
      expect(service.canReadTags()).toBe(false);
    });

    it('can read tags when the bridge has startTagReading', () => {
      pretendCordova();
      window.PrintLogNative = {
        startTagReading: () => Promise.resolve('ready'),
      } as unknown as PrintLogNativeBridge;
      expect(service.canReadTags()).toBe(true);
    });

    it('resolves unsupported when startTagReading throws', async () => {
      pretendCordova();
      window.PrintLogNative = {
        startTagReading: () => Promise.reject(new Error('native')),
      } as unknown as PrintLogNativeBridge;
      await expect(service.startTagReading(null)).resolves.toEqual(
        'unsupported'
      );
    });

    it('passes the reader config to startTagReading', async () => {
      pretendCordova();
      const start = vi.fn().mockResolvedValue('ready');
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
      expect(service.onTagReading(() => {})).toBe(false);
    });

    it('wires onTagReading when the bridge has it', () => {
      pretendCordova();
      const onTagReading = vi.fn();
      window.PrintLogNative = {
        onTagReading,
      } as unknown as PrintLogNativeBridge;
      const listener = () => {};
      expect(service.onTagReading(listener)).toBe(true);
      expect(onTagReading).toHaveBeenCalledWith(listener);
    });

    it('resolves null from consumeTag in an ordinary browser', async () => {
      await expect(service.consumeTag()).resolves.toEqual(null);
    });

    it('reports that onTag is not wired on an older shell', () => {
      pretendCordova();
      window.PrintLogNative = {} as PrintLogNativeBridge;
      expect(service.onTag(() => {})).toBe(false);
    });
  });
});
