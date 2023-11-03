/*  gui element to run stemweb
https://github.com/tla/stemmaweb/pull/172#issue-1680053781

refactor: small tweaks to button colors
refactor: replace space in ids for inputs in dropdowns with '-' (todo issued as #171)
feature: alphabetic compare function in utils.js
refactor: changed adding of eventlisteners in stemmaButtons.js

Tests to add:

    click on button "Run Stemweb" should open Stemweb dialog
    Dropdown should show names of Stemweb algorithms (currently: RHM, Neighbour joining, and Neighbour net)
    Click info badge ('i') should show description of algorithm
    Click on RHM should reveal argument field 'Iterations'
    Click on other algorithms should not show any argument fields
    Click on Cancel or anywhere outside dialog closes dialog
    Click on "Run" (not implemented yet, just closes dialog for now)

*/


beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

describe('Stemweb dialog should work properly', () => {
    it.skip('under construction', () => {
        // ...
    });
});