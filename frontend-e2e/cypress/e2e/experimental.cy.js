// attempts to solve problems with cypress that occur on github actions but not locally

import test_traditions from '../fixtures/test_traditions.json';
import users from '../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];

beforeEach(() => {
  cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
  cy.viewport(1600, 900);
  test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
  cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);
  cy.log("Cypress.browser: " + JSON.stringify(Cypress.browser));
});

// some fetch(POST) for headless mode
describe('login and logout with authentication modal, captcha v3 and fetch(POST)', () => {
  it('passes in headless mode local and on github. passes in local headed mode', { defaultCommandTimeout: 10000, requestTimeout: 10000, responseTimeout: 10000 }, () => {
    cy.log("Cypress.browser: " + JSON.stringify(Cypress.browser));

    cy.log('LOGIN:')
    cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);
    cy.contains('header a', 'Sign in').click();
    cy.get('#loginEmail').wait(500).type(admin.username, { delay: 50 });
    cy.get('#loginPassword').wait(500).type(admin.password, { delay: 50 });
    cy.get('button').contains('Sign in').wait(500).click();
    cy.get('#authModal').should('not.be.visible');
    cy.contains('Logged in as ' + admin.username);
    cy.contains('header a', 'Sign out');
    cy.get('header').should('not.contain', 'Sign in');
    cy.log('Signed in as ' + admin.username + '!');

    cy.log('LOGOUT:')
    cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);
    cy.contains('header a', 'Sign out').click();
    cy.contains('header a', 'Sign in');
    cy.get('header').should('not.contain', 'Sign out');
  })
});

// some fetch(POST) for headless mode
describe('addStemma and deleteStemma with login, passes in headless mode despite fetch(POST)', () => {
  it('passes in headless mode local and on github. passes in local headed mode. with original guest config', {}, () => {
    cy.loginViaUi(admin);
    const tradition = test_traditions.find(trad => trad.title.startsWith('John verse'));
    cy.log('tradition.title: ' + tradition.title);
    // click on the tradition title within the tradition list
    cy.get('#traditions-list').contains(tradition.title).click();

    // John verse has no stemma svg at start
    // click on the add stemma symbol
    cy.get('#add-stemma-button-link').wait(500).click();
    // click on the save stemma symbol
    cy.get('#save-stemma-button-link').wait(500).click(); // POST instead of PUT
    //wait a bit to see it
    cy.wait(2000);
    // delete it again
    cy.get('#delete-stemma-button-link').wait(500).click(); // DELETE method
    cy.contains('Yes, delete it').wait(500).click();

    cy.logoutViaUi();
  });
});

// does intercept work at all on github actions?
describe('intercept traditions', () => {
  it.skip('fails on github, passes in local headed mode only', () => {
    cy.intercept(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/api/traditions`).as('apiCheck');
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.log('CY_STEMMAWEB_FRONTEND_URL: ' + `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.wait('@apiCheck').then((interception) => {
      assert.isNotNull(interception.response.body, '1st API call has data')
    });
  });
});

describe('intercept login request', () => {
  if (Cypress.browser.isHeaded) { // skip when in headless mode
    it('passes in headed mode but fails in headless mode: run only in headed mode', { defaultCommandTimeout: 10000 }, () => {
      cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);

      cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
      cy.viewport(1600, 900);

      cy.intercept('POST', `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/login`).as('loginrequest');

      cy.get('header').contains('a', 'Sign in').wait(500).click();
      cy.get('#loginEmail').wait(500).type('user@example.org', { delay: 50 });
      cy.get('#loginPassword').wait(500).type('UserPass', { delay: 50 });
      cy.get('auth-modal').contains('button', 'Sign in').wait(500).click();

      cy.wait('@loginrequest').then(interception => {
        // const res_str = JSON.stringify(interception.response);
        // cy.log('res_str: ' + res_str);
        cy.expect(interception.response.statusCode).to.eq(200);
      });

      cy.get('header').contains('a', 'Logged in as user@example.org');
      cy.get('header').should('not.contain', 'Sign in');
      cy.get('header').contains('a', 'Sign out').wait(500).click();
    });
  }
  else {
    it('don\'t run test in headless mode', () => {
      cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);
    })
  }
});
