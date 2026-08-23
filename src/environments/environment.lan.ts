import packageInfo from '../../package.json';

/**
 * Used only by the `lan` build configuration (`npm run start:lan`), for testing on a
 * phone or tablet on the same network.
 *
 * Plain HTTP on purpose. The dev servers use a self-signed certificate, which a
 * desktop browser can be told to trust once but a mobile browser will refuse for an
 * IP address - and an HTTPS page may not call an HTTP API, so half-measures do not
 * work either. Dropping both ends to HTTP is what makes this reachable at all.
 *
 * `printLogApiUrl` is derived from whatever host the page was served from rather than
 * hardcoded, so the same build works from `localhost` on this machine and from
 * `192.168.x.x` on the phone - and no one's LAN address ends up committed.
 */
const apiHost =
  typeof globalThis !== 'undefined' && globalThis.location?.hostname
    ? globalThis.location.hostname
    : 'localhost';

export const environment = {
  production: false,
  printLogApiUrl: `http://${apiHost}:5000`,
  version: packageInfo.version,
  devAuthBypass: true,
  authentication: {
    domain: 'dev-3dprintlog.auth0.com',
    client_id: 'Z08zKCebdjkBK7Ew281y1W2g2LGBp2SZ',
    audience: 'https://dev.3dprintlog.com/api',
  },
  googleAnalyticsMeasurementId: 'G-4TEMNSY6QX',
  appInsights: {
    instrumentationKey: 'aea218c9-705c-4566-89ec-ec01aca375b4',
  },
  features: {
    userProfile: true,
  },
  googleAds: {
    trafficSearchConversion: '',
  },
  stripe: {
    proMonthlyPriceId: 'price_1T5XDzFYDvupkrWux9g8k5Hy',
    proAnnualPriceId: 'price_1T5XDzFYDvupkrWuS7tZCMtW',
  },
};
