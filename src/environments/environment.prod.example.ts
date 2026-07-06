import packageInfo from '../../package.json';

export const environment = {
  production: true,
  printLogApiUrl: 'https://YOUR_API_URL',
  version: packageInfo.version,
  devAuthBypass: false,
  authentication: {
    domain: 'YOUR_AUTH0_TENANT.auth0.com',
    client_id: 'YOUR_AUTH0_CLIENT_ID',
    audience: 'https://YOUR_AUTH0_AUDIENCE',
  },
  googleAnalyticsMeasurementId: 'YOUR_GA_MEASUREMENT_ID',
  appInsights: {
    instrumentationKey: 'YOUR_APPINSIGHTS_KEY',
  },
  features: {
    userProfile: true,
  },
  googleAds: {
    trafficSearchConversion: 'YOUR_GOOGLE_ADS_CONVERSION_ID',
  },
  stripe: {
    proMonthlyPriceId: 'YOUR_STRIPE_MONTHLY_PRICE_ID',
    proAnnualPriceId: 'YOUR_STRIPE_ANNUAL_PRICE_ID',
  },
};
