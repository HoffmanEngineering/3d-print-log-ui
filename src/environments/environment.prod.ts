import packageInfo from '../../package.json';
export const environment = {
  production: true,
  printLogApiUrl: 'https://api.3dprintlog.com',
  version: packageInfo.version,
  authentication: {
    domain: '3dprintlog.auth0.com',
    client_id: '3JOtliMnZIQJDZ5auHia2GZEydfXW9xB',
    audience: 'https://3dprintlog.com/api',
  },
  googleAnalyticsId: 'G-4TEMNSY6QX',
  appInsights: {
    instrumentationKey: '3c9f6914-555b-4442-8724-0d5b706d115a',
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
    trafficSearchConversion: 'AW-837103521/Zn4kCLWd85IDEKHflI8D',
  },
  stripe: {
    proMonthlyPriceId: '',
    proAnnualPriceId: '',
  },
};
