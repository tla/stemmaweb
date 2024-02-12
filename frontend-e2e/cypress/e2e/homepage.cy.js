/* Assert everything is visible for an admin on the homepage upon login */

import test_traditions from '../fixtures/test_traditions.json';
import users from '../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.loginViaUi(admin);
});

afterEach(() => {
    cy.logoutViaUi(admin);
});

// on the homepage, the admin should see all traditions listed
// to do: traditions should be sorted alphabetically
describe('all traditions are listed', () => {
    it('passes', () => {
        // the number of displayed traditions should be equal to the total number of test_traditions
        const count = test_traditions.length; // 7
        cy.get('ul#traditions-list').children().should('have.length', count);
        test_traditions.forEach((tradition) => {
            cy.log("title: " + tradition.title);
            // the test_tradition titles should all be found on the homepage
            cy.get('ul#traditions-list').contains(tradition.title).should('be.visible');
        });
    });
});
