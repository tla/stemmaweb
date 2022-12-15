const { defineConfig } = require('cypress');
const env = require('./env');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    }
  },
  env: {
    ...env
  }
});
