// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Replace Google's reCAPTCHA v3 script with a stub that hands out a fixed token.
// The middleware verifies the token against the local `recaptcha` mock service
// (see docker-compose.test.yml), so the real verification path is still exercised.
// 'e2e-human-token' is accepted (score 0.9); 'e2e-bot-token' is rejected (score 0.1).
Cypress.Commands.add('stubRecaptcha', (token = 'e2e-human-token') => {
  cy.intercept('GET', 'https://www.google.com/recaptcha/api.js*', {
    headers: { 'content-type': 'application/javascript' },
    body: `window.grecaptcha = {
      ready: (callback) => callback(),
      execute: () => Promise.resolve('${token}')
    };`
  });
});

// Log in through the middleware API and cache the session, so that tests which
// only need to *be* logged in don't pay for the login form. Call before `cy.visit`.
// Use `loginViaForm` (helpers.js) only when the login form itself is under test.
Cypress.Commands.add('login', (user) => {
  const middleware = Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL');
  cy.session(
    user.username,
    () => {
      cy.request('POST', `${middleware}/login`, {
        recaptcha_token: 'e2e-human-token', // accepted by the recaptcha mock
        id: user.username,
        passphrase: user.password
      });
    },
    {
      validate: () => {
        cy.request(`${middleware}/user`)
          .its('body.user.id')
          .should('eq', user.username);
      },
      cacheAcrossSpecs: true
    }
  );
});

// Delete all traditions and users, then reload the mini test data set (see seed.js)
Cypress.Commands.add('reseedDB', () => {
  cy.task('reseedDB', null, { timeout: 120000 });
});
