const { defineConfig } = require('cypress');
const env = require('./env');

module.exports = defineConfig({
  e2e: {
    // specPattern : 'cypress/e2e/experimental.cy.js', // default:: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'

    // TODO: reset viewport to landscape format (e.g.1600 x 900) when the 50 added sections are accessible
    viewportWidth: 1600,
    viewportHeight: 3200,

    // other e2e options...

    setupNodeEvents(on, config) {
      // implement node event listeners here
    }
  },
  env: {
    ...env
  }
});
