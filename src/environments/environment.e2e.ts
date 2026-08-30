import packageInfo from '../../package.json';

/**
 * Used only by the `e2e` build configuration, which CI serves over plain HTTP.
 * Identical to `environment.ts` except for `printLogApiUrl`: CI runs the API
 * on http://localhost:5000 so that neither server needs a self-signed
 * certificate, and an HTTPS page may not call an HTTP API (mixed content).
 */
export const environment = {
  production: false,
  printLogApiUrl: 'http://localhost:5000',
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
  /**
   * Feature Flags
   */
  features: {
    /**
     * Enable the UserProfile Feature
     */
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
