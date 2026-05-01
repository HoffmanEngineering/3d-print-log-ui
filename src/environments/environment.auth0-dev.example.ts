import packageInfo from '../../package.json';

export const environment = {
  production: false,
  printLogApiUrl: 'https://localhost:5001',
  version: packageInfo.version,
  devAuthBypass: false,
  authentication: {
    domain: 'YOUR_AUTH0_DEV_TENANT.auth0.com',
    client_id: 'YOUR_AUTH0_DEV_CLIENT_ID',
    audience: 'https://YOUR_AUTH0_DEV_AUDIENCE',
  },
  googleAnalyticsId: '',
  appInsights: {
    instrumentationKey: '',
  },
  features: {
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
