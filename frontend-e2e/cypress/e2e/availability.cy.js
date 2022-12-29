describe('Stemmaweb is available', () => {
  it('passes', () => {
    cy.once('uncaught:exception', () => false);
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
  });
});

describe('Middleware is healthy', () => {
  it('passes', () => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/`);
    cy.get('body').contains('Middleware is healthy');
  });
});

describe('Stemmarest is healthy', () => {
  it('passes', () => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/stemmarest-health`);
    cy.get('body').contains('Stemmarest is healthy');
  });
});