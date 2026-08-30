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
});
