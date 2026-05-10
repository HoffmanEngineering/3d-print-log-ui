// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
import '@testing-library/cypress/add-commands';

// Suppress uncaught exceptions from third-party scripts (e.g. AdSense)
// so they don't fail tests when the session is created on a cold run.
Cypress.on('uncaught:exception', () => false);

// Alternatively you can use CommonJS syntax:
// require('./commands')
