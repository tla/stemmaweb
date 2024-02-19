// attempts to solve problems with cypress that occur on github actions but not locally

// does intercept work at all on github actions?
describe('intercept traditions', () => {
  it.skip('fails on github, passes locally', () => {
    cy.intercept(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/api/traditions`).as('apiCheck');
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.log('CY_STEMMAWEB_FRONTEND_URL: ' + `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.wait('@apiCheck').then((interception) => {
      assert.isNotNull(interception.response.body, '1st API call has data')
    });
  });
});

describe('intercept login request', () => {
  if (Cypress.env('CY_MODE') === 'headed') { // skip when in headless mode
  it('passes in headed mode but fails in headless mode: run only in headed mode', { defaultCommandTimeout: 10000 }, () => {
    cy.log("Cypress.env('CY_MODE'): " + Cypress.env('CY_MODE'));

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
    cy.get('header').contains('a', 'Sign out'); // for now, don't click without interception
  });
}
});
