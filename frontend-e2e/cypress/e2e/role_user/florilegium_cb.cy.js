/* florilegium_cb: When asserted as not logged in, or just without logging in,
    - the 'Florilegium Coislinianum B' tradition title should be visible in the 'TEXT DIRECTORY'.
    - after clicking on the 'Florilegium Coislinianum B' tradition title, 
        - the 'Owner user@example.org' should be displayed,
        - the 'Witnesses B,K,F,G,S,C,D,Q,A,H,T,P,E' should be displayed. */

import test_traditions from '../../fixtures/test_traditions.json';
import users from '../../fixtures/users.json';
const user1 = users.filter(({username}) => username === 'user@example.org')[0];

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.viewport(1600, 900);
    test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
    cy.loginViaUi(user1);
});

afterEach(() => {
    cy.logoutViaUi();
});

// TODO: should not be visible for a guest.
describe("'Florilegium Coislinianum B' has the right owner and witnesses", function () {
  it('passes', function () {

    cy.wait(500);
    /* cy.get('#tradition-name').should(($tn) => { 
          expect($tn.text().trim()).to.not.equal('Notre besoin'); }); // should fail. 
          // Does not fail because the tradition_name is not loaded so quickly.
          // Eventually it is 'Notre besoin'. It fails as it should, 
          // only after waiting a bit, e.g. with cy.wait(1000) */

    /* cy.get('#tradition-name').contains('Notre besoin'); // passes as expected, 
      // it is the intended first view of the page.
      // But one could also check if Florilegium is not there, 
      // and only there, after clicking on in in the toc. */

    const expectedName = 'Florilegium "Coislinianum B"'
    cy.get('#tradition-name').should(($tn) => {
      expect($tn.text().trim()).to.not.equal('Florilegium Coislinianum B');
    }); // should pass
    // is there a better way to assert 'does not contain text xyz'?
    cy.get('#tradition-name').should('not.have.text', expectedName)
    cy.get('tradition-list')
      .contains(expectedName)
      .click();
    cy.get('#tradition-name').contains(expectedName);
    cy.get('#sidebar-properties').contains('user@example.org');
    // Sort the witness list for better reliability
    cy.get('#sidebar-properties').contains('A, B, C, D, E, F, G, H, K, P, Q, S, T');
  });
});