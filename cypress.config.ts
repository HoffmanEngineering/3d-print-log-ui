import { defineConfig } from 'cypress';

export default defineConfig({
  defaultCommandTimeout: 10000,

  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config);
    },
    experimentalSessionAndOrigin: true,
    baseUrl: 'https://localhost:4200',
    // The home capture is a generator, not a test. With no specPattern here it
    // fell inside Cypress's default glob, so `npx cypress run` and the nightly
    // e2e job both ran it — at device-scale-factor 1, because that flag lives in
    // cypress.config.capture.ts. It overwrites the same PNG filenames that
    // `npm run capture:home:process` reads, at half the intended resolution.
    excludeSpecPattern: ['cypress/e2e/**/capture-*.cy.ts'],
  },
});
