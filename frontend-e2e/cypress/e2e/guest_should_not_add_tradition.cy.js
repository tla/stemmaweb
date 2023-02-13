// guest_should_not_add_tradition: 
//    When asserted as not logged in, 
//    the circle-plus-feather next to 'Add text directory' 
//    should not be visible.

describe("A guest should not see the 'add a tradition' feather-plus-circle", function(){
  it.skip('passes', function(){
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.get('header').contains('Sign in');
    // cy.contains('h6', 'Text dirtectory').find('svg circle'); // is there
    // cy.contains('h6', 'Text dirtectory').find('svg circle').should('exist'); // is there // try out 'exist'
    // cy.contains('h6', 'Text dirtectory').find('svg circle').should('not.exist'); // it might exist in the dom but should not be visible
    // cy.contains('h6', 'Text dirtectory').find('svg').should('be.visible'); // is visible

    cy.contains('h6', 'Text directory').find('svg').should('not.be.visible'); // fails as expected, ok.

    })
})
