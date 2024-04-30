/* Assert everything is visible for an admin on the homepage upon login */

import test_traditions from '../fixtures/test_traditions.json';
import users from '../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];
const selected_fill_color = 'rgb(207, 220, 238)';

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.viewport(1600, 900);
    test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
    cy.loginViaUi(admin); // TODO: also for headless mode
});

afterEach(() => {
    cy.logoutViaUi(admin); // TODO: also for headless mode
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

describe('Assert that only one tradition is highlighted in the sidebar menu: \
    the current one, clicked on, or \
    the first one upon loading the page.', () => {
    it('under construction', () => {
        test_traditions.forEach((tradition, i) => {
            // traditions are displayed in alphabetical order (test_traditions sorted above)
            // cy.log('idx+1) test_tradition title: ' + String(Number(i)+1) + ') ' +tradition.title);
            // cy.log('same idx+1) tradition title: ' + cy.get('ul#traditions-list > li').eq(i));
            cy.get('ul#traditions-list > li').eq(i).contains(tradition.title).should('be.visible');

            // on load only the first tradition is selected and highlighted
            if (i == 0){
                cy.get('ul#traditions-list > li > div > div').eq(i).should('have.class', 'selected');
                cy.get('ul#traditions-list > li > div > div > svg').eq(i).should('have.css', 'fill', selected_fill_color)
            }
            else {
                cy.get('ul#traditions-list > li > div > div').eq(i).should('not.have.class', 'selected');
                cy.get('ul#traditions-list > li > div > div > svg').eq(i).should('not.have.css', 'fill', selected_fill_color);
            }
        });

        // Click on another tradition higlights its title and the others are not selected or highlighted
        // To do
    });

});
