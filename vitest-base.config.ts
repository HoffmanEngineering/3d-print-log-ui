import { defineConfig } from 'vitest/config';

// Merged into the configuration the Angular unit-test builder generates
// (angular.json `runnerConfig`). Only what the builder has no option for goes here.
export default defineConfig({
  resolve: {
    alias: [
      // qrcode's package.json maps its Node entry to lib/browser.js through the
      // `browser` field, which the app build honours and the test browser's
      // dependency optimizer does not. Without this the tests load the Node
      // renderer (pngjs, which needs Node's util and stream) and fail.
      { find: /^qrcode$/, replacement: 'qrcode/lib/browser.js' },
    ],
  },
  test: {
    browser: {
      // Browser mode saves a screenshot of every failure into a __screenshots__
      // folder beside the spec, inside src/. The failure output is enough.
      screenshotFailures: false,
    },
  },
});
