// attempts to solve problems with cypress that occur on github actions but not locally

// does intercept work at all on github actions?
describe('intercept traditions', () => {
  it('passes', () => {
    cy.intercept(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/api/traditions`).as('apiCheck'); // OK
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.wait('@apiCheck').then((interception) => {
      assert.isNotNull(interception.response.body, '1st API call has data')
    });
  });
});
