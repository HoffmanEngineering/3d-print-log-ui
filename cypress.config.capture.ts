import { defineConfig } from 'cypress';

// The browser window, in DEVICE pixels. Every CSS pixel costs two of these at
// the 2x device-scale-factor below, so the default headless 1280x720 window
// leaves only 640x360 CSS to work with — and cy.viewport() is silently CLAMPED
// to what the window can actually show.
//
// That clamp is why this number matters. An element taller than the viewport is
// not screenshotted in one pass: Cypress scrolls and stitches, and content that
// falls on the seam is torn. It does not fail, it just produces a subtly broken
// image. The print-list capture shipped that way, cut through its third card at
// exactly 660px - the clamped viewport height. Keep this comfortably above
// 2 x the WIDEST and 2 x the TALLEST viewport across every capture set: the
// desktop doc figures ask for 1280 CSS px, which is 2560 device px here.
// `fitViewportToTarget` in cypress/support/capture.ts fails the run rather than
// capturing a clamped viewport, so raising this is the documented fix.
const WINDOW_SIZE = '2800,4200';

// Capture-only config. Adds a 2x device-scale-factor so element screenshots
// are HiDPI, and restricts the run to the capture spec. The normal E2E config
// (cypress.config.ts) is intentionally untouched.
export default defineConfig({
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: 'https://localhost:4200',
    experimentalSessionAndOrigin: true,
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/capture-*.cy.ts',
    setupNodeEvents(on, config) {
      // Reuse existing plugins (session bypass etc.)
      require('./cypress/plugins/index.js')(on, config);
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--force-device-scale-factor=2');
          launchOptions.args.push('--high-dpi-support=1');
          launchOptions.args.push(`--window-size=${WINDOW_SIZE}`);
        }
        return launchOptions;
      });
      return config;
    },
  },
});
