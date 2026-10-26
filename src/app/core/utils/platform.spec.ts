import { TestBed } from '@angular/core/testing';
import {
  CORDOVA_IOS_USER_AGENT,
  CORDOVA_USER_AGENT,
  IS_CORDOVA,
  IS_CORDOVA_IOS,
  isCordovaAndroidPlatform,
  isCordovaIosPlatform,
  isCordovaPlatform,
} from './platform';

describe('platform', () => {
  let realUserAgent: PropertyDescriptor | undefined;

  /** The checks read navigator.userAgent, so each shell is simulated at the source. */
  function pretendUserAgent(value: string): void {
    Object.defineProperty(navigator, 'userAgent', {
      value,
      configurable: true,
    });
  }

  beforeEach(() => {
    realUserAgent = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'userAgent'
    );
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
  });

  it('keeps the two shells on distinct user agents', () => {
    expect(CORDOVA_IOS_USER_AGENT).not.toBe(CORDOVA_USER_AGENT);
  });

  it('recognizes the Android shell as Cordova and Android only', () => {
    pretendUserAgent(CORDOVA_USER_AGENT);

    expect(isCordovaPlatform()).toBeTrue();
    expect(isCordovaAndroidPlatform()).toBeTrue();
    expect(isCordovaIosPlatform()).toBeFalse();
  });

  it('recognizes the iOS shell as Cordova and iOS only', () => {
    pretendUserAgent(CORDOVA_IOS_USER_AGENT);

    expect(isCordovaPlatform()).toBeTrue();
    expect(isCordovaIosPlatform()).toBeTrue();
    expect(isCordovaAndroidPlatform()).toBeFalse();
  });

  it('treats a browser, including Safari on iPhone, as neither shell', () => {
    pretendUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    );

    expect(isCordovaPlatform()).toBeFalse();
    expect(isCordovaAndroidPlatform()).toBeFalse();
    expect(isCordovaIosPlatform()).toBeFalse();
  });

  it('resolves the injection tokens from the user agent', () => {
    pretendUserAgent(CORDOVA_IOS_USER_AGENT);

    expect(TestBed.inject(IS_CORDOVA)).toBeTrue();
    expect(TestBed.inject(IS_CORDOVA_IOS)).toBeTrue();
  });
});
