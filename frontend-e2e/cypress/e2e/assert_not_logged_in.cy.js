describe('Assert "Sign in" is visible just upon visit, when not logged in yet', () => {
    it('passes', () => {
      cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
      cy.get('header').contains('Sign in');
    });
  });
