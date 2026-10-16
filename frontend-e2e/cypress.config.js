const { defineConfig } = require('cypress');
const env = require('./env');
const { reseedDB } = require('./seed');
const { clearDownloads, listDownloads } = require('./downloads');

module.exports = defineConfig({
  e2e: {
    // specPattern : 'cypress/e2e/experimental.cy.js', // default:: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'

    // with 4x20 florilegium sections and all others unfolded, it would need width: 1600, and height: 3200 for not to need scrolling. Common viewport:
    viewportWidth: 1920,
    viewportHeight: 1080,

    // other e2e options...

    setupNodeEvents(on, config) {
      on('task', {
        reseedDB: (dataSet) =>
          reseedDB(config.env.CY_STEMMAREST_ENDPOINT, dataSet).then(() => null),
        clearDownloads: () => clearDownloads(config.downloadsFolder),
        listDownloads: () => listDownloads(config.downloadsFolder)
      });
    }
  },
  env: {
    ...env
  }
});
