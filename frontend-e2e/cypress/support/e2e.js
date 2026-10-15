// ***********************************************************
// This example support/e2e.js is processed and
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

// Alternatively you can use CommonJS syntax:
// require('./commands')

import './helpers';
import './properties';
import './sections';
import './stemmata';
import './stemweb';
import './collation';

// Every spec file starts from the seed data and then reseeds itself only where a test changes
// data: call cy.reseedDB() in a beforeEach (or inside the test) in those places.
before(() => {
  cy.reseedDB();
});

beforeEach(() => {
  cy.stubRecaptcha();
});
