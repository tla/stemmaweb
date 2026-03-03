const { defineConfig } = require('cypress');
const env = require('./env');

module.exports = defineConfig({
  e2e: {
    // specPattern : 'cypress/e2e/experimental.cy.js', // default:: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'

    setupNodeEvents(on, config) {
      // implement node event listeners here
    }
  },
  env: {
    ...env
  }
});
