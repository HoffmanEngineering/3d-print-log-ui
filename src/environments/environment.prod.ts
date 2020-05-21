export const environment = {
  production: true,
  printLogApiUrl: 'https://3d-print-log-api-prod.azurewebsites.net',
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
    userProfile: false,
  },
};
