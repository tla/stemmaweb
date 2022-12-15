const { defineConfig } = require('cypress');
const env = require('./env');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    }
  },
  env: {
    STEMMAWEB_FRONTEND_URL: env.STEMMAWEB_FRONTEND_URL,
    STEMMAWEB_MIDDLEWARE_URL: env.STEMMAWEB_MIDDLEWARE_URL
  }
});
