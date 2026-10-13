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

// Specs under e2e/role_* are the old suite: they mutate data freely and rely on a
// fresh database for every test. New specs live directly in e2e/, reseed once per
// file, and must call cy.reseedDB() themselves in any test that changes data.
const isLegacySpec = () => Cypress.spec.relative.includes('/role_');

before(() => {
  if (!isLegacySpec()) cy.reseedDB();
});

beforeEach(() => {
  cy.stubRecaptcha();
  if (isLegacySpec()) cy.reseedDB();
});
