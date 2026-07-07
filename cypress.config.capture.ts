import { defineConfig } from 'cypress';

// Capture-only config. Adds a 2x device-scale-factor so element screenshots
// are HiDPI, and restricts the run to the capture spec. The normal E2E config
// (cypress.config.ts) is intentionally untouched.
export default defineConfig({
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: 'https://localhost:4200',
    experimentalSessionAndOrigin: true,
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/home/capture-home-screenshots.cy.ts',
    setupNodeEvents(on, config) {
      // Reuse existing plugins (session bypass etc.)
      require('./cypress/plugins/index.js')(on, config);
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--force-device-scale-factor=2');
          launchOptions.args.push('--high-dpi-support=1');
        }
        return launchOptions;
      });
      return config;
    },
  },
});
