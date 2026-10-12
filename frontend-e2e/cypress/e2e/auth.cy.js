import users from '../fixtures/users.json';

const user = users.find(({ username }) => username === 'user@example.org');

describe('Login with reCAPTCHA', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/login').as('login');
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
  });

  it('accepts a login whose reCAPTCHA token scores as human', () => {
    cy.loginViaUi(user);
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.logoutViaUi();
  });

  it('rejects a login whose reCAPTCHA token scores as a bot', () => {
    // the script is fetched on page load, so reload for the new stub to apply
    cy.stubRecaptcha('e2e-bot-token');
    cy.reload();
    cy.contains('header a', 'Sign in').click();
    cy.get('#loginEmail').type(user.username);
    cy.get('#loginPassword').type(user.password);
    cy.get('button').contains('Sign in').click();

    cy.wait('@login').its('response.statusCode').should('eq', 429);
    cy.get('header').should('not.contain', 'Sign out');
  });
});
