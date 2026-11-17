import {
  createTelemetryNoiseFilter,
  TelemetryNoiseItem,
} from './telemetry-noise-filter';

describe('createTelemetryNoiseFilter', () => {
  const isNoise = createTelemetryNoiseFilter({
    appOrigin: 'https://www.3dprintlog.com',
    apiUrl: 'https://api.3dprintlog.com',
    authDomain: 'login.3dprintlog.com',
  });

  const dependency = (target: unknown): TelemetryNoiseItem => ({
    baseType: 'RemoteDependencyData',
    baseData: { target, name: 'GET /x' },
  });

  const exception = (
    message: string,
    frames: string[] = [],
    stack?: string,
    typeName = 'Error'
  ): TelemetryNoiseItem => ({
    baseType: 'ExceptionData',
    baseData: {
      exceptions: [
        {
          typeName,
          message,
          stack,
          parsedStack: frames.map((fileName, level) => ({
            level,
            fileName,
            method: 'f',
            line: 1,
          })),
        },
      ],
    },
  });

  describe('dependencies', () => {
    it.each([
      'https://api.3dprintlog.com/api/notifications/unread-count',
      'https://www.3dprintlog.com/assets/i18n/en.json',
      '/assets/config.json',
      'https://dev-3dprintlog.auth0.com/oauth/token',
      'https://3dprintlog.us.auth0.com/oauth/token',
      'https://login.3dprintlog.com/oauth/token',
      'API.3dprintlog.com/api/Prints',
    ])('keeps a call to %s', (target) => {
      expect(isNoise(dependency(target))).toBe(false);
    });

    it.each([
      'https://region1.analytics.google.com/g/collect?v=2',
      'https://analytics.google.com/g/collect',
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://googleads.g.doubleclick.net/pagead/id',
      'https://www.google.com/ccm/collect',
      'https://www.google.com/rmkt/collect/123',
      'https://www.googleadservices.com/pagead/conversion/1',
      'https://fundingchoicesmessages.google.com/i/pub-1',
      'https://fonts.gstatic.com/s/roboto.woff2',
      'https://www.googletagmanager.com/gtag/js?id=G-1',
      'region1.analytics.google.com',
    ])('drops a third-party call to %s', (target) => {
      expect(isNoise(dependency(target))).toBe(true);
    });

    it('does not treat a look-alike of auth0.com as Auth0', () => {
      expect(
        isNoise(dependency('https://evil-auth0.com.example.net/token'))
      ).toBe(true);
      expect(isNoise(dependency('https://notauth0.com/token'))).toBe(true);
    });

    it('reads the host before a correlation suffix', () => {
      expect(
        isNoise(dependency('https://api.3dprintlog.com | cid-v1:abc'))
      ).toBe(false);
      expect(
        isNoise(dependency('https://region1.analytics.google.com | cid-v1:x'))
      ).toBe(true);
    });

    it('keeps a dependency it cannot read', () => {
      expect(isNoise(dependency(undefined))).toBe(false);
      expect(isNoise(dependency(''))).toBe(false);
      expect(isNoise(dependency(42))).toBe(false);
      expect(isNoise({ baseType: 'RemoteDependencyData' })).toBe(false);
    });
  });

  describe('exceptions', () => {
    it.each([
      ['Uncaught Error: int64', []],
      ['int64', []],
      [
        'adsbygoogle.push() error: No slot size for availableWidth=0',
        ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'],
      ],
      ['ResizeObserver loop completed with undelivered notifications.', []],
      ['Script error.', []],
      [
        "Script error: The browser's same-origin policy prevents us from getting the details of this exception. Consider using the 'crossorigin' attribute.",
        [],
      ],
    ] as Array<[string, string[]]>)(
      'drops known third-party noise: %s',
      (message, frames) => {
        expect(isNoise(exception(message, frames))).toBe(true);
      }
    );

    it('drops a TagError by its type name', () => {
      expect(
        isNoise(exception('No slot size', [], undefined, 'TagError'))
      ).toBe(true);
    });

    it('keeps known noise when a frame comes from the app itself', () => {
      expect(
        isNoise(
          exception('ResizeObserver loop completed', [
            'https://www.3dprintlog.com/chunk-ABC.js',
          ])
        )
      ).toBe(false);
      expect(
        isNoise(
          exception(
            'Uncaught Error: int64',
            [],
            'Error: int64\n    at f (https://www.3dprintlog.com/main-XYZ.js:1:2)'
          )
        )
      ).toBe(false);
    });

    it('keeps an error that does not match known noise, with or without a stack', () => {
      expect(isNoise(exception('Cannot read properties of null', []))).toBe(
        false
      );
      expect(
        isNoise(
          exception('Something failed', [
            'https://pagead2.googlesyndication.com/x.js',
          ])
        )
      ).toBe(false);
    });

    it('keeps an exception item it cannot read', () => {
      expect(isNoise({ baseType: 'ExceptionData' })).toBe(false);
      expect(
        isNoise({ baseType: 'ExceptionData', baseData: { exceptions: [] } })
      ).toBe(false);
    });
  });

  it('keeps every other kind of item', () => {
    expect(
      isNoise({
        baseType: 'PageviewData',
        baseData: { uri: 'https://region1.analytics.google.com' },
      })
    ).toBe(false);
    expect(isNoise({})).toBe(false);
  });
});
