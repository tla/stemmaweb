/*  Changing Tradition metadata should be fully functional
https://github.com/tla/stemmaweb/pull/128#issuecomment-1428087233

Cypress tests to be added:

    Update/change of
        name,
        access,
        language,
        and direction
        using the edit button (top right hand side) should be reflected in the properties shown in the table.
    If the name changes, that should also be visible in the main page (top of page has the name/title of the Tradition).

Note that this PR also starts implementing displaying sections and display/change of section metadata, but this is not test ready yet.

Update 2023-02-14: section metadata is now showing correctly, and can be tested, no editing sections yet.

Cypress tests to be added:

    Clicking a tradition should expand a list of sections
    Clicking section should show section in properties pane (right hand side)
    Clicking a section of another tradition should update screen to that tradition, its related primary stemma, properties, and the properties of the section
    Clicking a tradition should remove section properties from another tradition in the section properties pane on the right hand side of the screen

*/

import { test_traditions } from './_shared_variables.js';

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

// count sections of each (public) tradition is correct
describe('Changing Tradition metadata should be fully functional', () => {
    it.skip('under construction', () => { // set db to initial state
        // test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
        test_traditions.forEach((tradition) => {
            cy.log(tradition.title);
            // ...
        });
    });
});
