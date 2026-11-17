import packageInfo from '../../package.json';
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  printLogApiUrl: 'https://unittest.3dprintlog.dev',
  version: packageInfo.version,
  devAuthBypass: false,
  authentication: {
    domain: 'unittest.3dprintlog.dev',
    client_id: '123-456',
    audience: 'https://unittest.3dprintlog.dev',
  },
  googleAnalyticsMeasurementId: 'G-4TEMNSY6QX',
  appInsights: {
    instrumentationKey: null,
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
    proMonthlyPriceId: '',
    proAnnualPriceId: '',
  },
};
