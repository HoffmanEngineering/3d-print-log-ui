import { version } from '../../package.json';
export const environment = {
  production: true,
  printLogApiUrl: 'https://api.3dprintlog.com',
  version,
  authentication: {
    domain: '3dprintlog.auth0.com',
    client_id: '3JOtliMnZIQJDZ5auHia2GZEydfXW9xB',
    audience: 'https://3dprintlog.com/api',
  },
  googleAnalyticsId: 'UA-65004387-6',
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
};
