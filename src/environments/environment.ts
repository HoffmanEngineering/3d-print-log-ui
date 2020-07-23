// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  printLogApiUrl: 'https://localhost:5001',
  authentication: {
    domain: 'dev-3dprintlog.auth0.com',
    client_id: 'Z08zKCebdjkBK7Ew281y1W2g2LGBp2SZ',
    audience: 'https://dev.3dprintlog.com/api',
  },
  googleAnalyticsId: 'UA-65004387-7',
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
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
