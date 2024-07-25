/* Assert everything is visible for an admin on the homepage upon login */

import test_traditions from '../../fixtures/test_traditions.json';
import users from '../../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];
const selected_fill_color = 'rgb(207, 220, 238)';

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.viewport(1600, 900);
    test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
    cy.loginViaUi(admin);
});

afterEach(() => {
    cy.logoutViaUi();
});

// on the homepage, the admin should see all traditions listed
// traditions with stemma should have buttons: edit add delete; those without: add
describe('all traditions are listed and provide stemma add or edit buttons', () => {
    it('passes', () => {
        // the number of displayed traditions should be equal to the total number of test_traditions
        const count = test_traditions.length; // 7
        cy.get('ul#traditions-list').children().should('have.length', count);
        test_traditions.forEach((tradition) => {
            cy.log("title: " + tradition.title);
            // the test_tradition titles should all be found on the homepage
            // together with their stemmas
            cy.get('ul#traditions-list').contains(tradition.title).should('be.visible').click();
            if (tradition.stemmata.length){
                cy.log('Number of stemmata: ' + tradition.stemmata.length);
                // traditions with a stemma should have buttons highlighted: edit add delete
                cy.get('edit-stemma-buttons').within( ()=> {
                    cy.get('a#edit-stemma-button-link').should('be.visible').and('not.have.class', 'greyed-out');
                    cy.get('a#add-stemma-button-link').should('be.visible').and('not.have.class', 'greyed-out');
                    cy.get('a#delete-stemma-button-link').should('be.visible').and('not.have.class', 'greyed-out');
                });
            }
            else {
                // traditions with no stemma should have buttons highlighted: add
                cy.get('edit-stemma-buttons').within( ()=> {
                    cy.get('a#edit-stemma-button-link').should('be.visible').and('have.class', 'greyed-out');
                    cy.get('a#add-stemma-button-link').should('be.visible').and('not.have.class', 'greyed-out');
                    cy.get('a#delete-stemma-button-link').should('be.visible').and('have.class', 'greyed-out');
                });
            }
        });
    });
});

// Assert that the stemma “edit” button is only enabled when there is a stemma (also the “delete” button/cross), and that it disappears on click, being being replaced, together with the “new” and “delete” button, by a “save” and a “cancel” button.

describe('Assert that only one tradition is highlighted in the sidebar menu: \
    the current one, clicked on, or \
    the first one upon loading the page.', () => {
    // implements #164
    it('passes', () => {
        let n = 0 // check the first tradition at start
        test_traditions.forEach((tradition, i) => {
            // traditions are displayed in alphabetical order (test_traditions sorted above)
            cy.log('idx+1) test_tradition title: ' + String(Number(i)+1) + ') ' +tradition.title);
            cy.get('ul#traditions-list > li').eq(i).find('a')
            .invoke('text')
            .then((text) => {
                expect(text.trim()).to.equal(tradition.title.trim())
                cy.log('same idx+1) tradition title: ' + text.trim())
            });
            cy.get('ul#traditions-list > li').eq(i).contains(tradition.title).should('be.visible');

            // on load only the first tradition is selected and highlighted
            if (i == n){
                cy.get('ul#traditions-list > li').eq(i).find('div').should('have.class', 'selected');
                cy.get('ul#traditions-list > li').eq(i).find('svg').should('have.css', 'fill', selected_fill_color)
            }
            else {
                cy.get('ul#traditions-list > li').eq(i).find('div').should('not.have.class', 'selected');
                cy.get('ul#traditions-list > li').eq(i).find('svg').should('not.have.css', 'fill', selected_fill_color);
            }
        });

        // Click on another tradition higlights its title and the others are not selected or highlighted
        n = 3; // check nth tradition
        cy.log('Click on ' + String(Number(n)+1) + '. tradition and assert selection');
        cy.get('ul#traditions-list > li').eq(n).click();
        cy.get('ul#traditions-list > li').eq(n).find('a') // <li> contains also section info text, <a> just the title
        .invoke('text')
        .then((text) => {
            cy.log('Clicked on ' + String(Number(n)+1) + '. tradition title: ' + text.trim())
        });
        // Assert all traditions are correctly un-/selected and un-/filled
        test_traditions.forEach((tradition, i) => {
            // Only the clicked tradition is selected and highlighted
            if (i == n){
                cy.get('ul#traditions-list > li').eq(i).find('div').should('have.class', 'selected');
                cy.get('ul#traditions-list > li').eq(i).find('svg').should('have.css', 'fill', selected_fill_color)
            }
            else {
                cy.get('ul#traditions-list > li').eq(i).find('div').should('not.have.class', 'selected');
                cy.get('ul#traditions-list > li').eq(i).find('svg').should('not.have.css', 'fill', selected_fill_color);
            }
        });
    });

});

describe('message console logs errors and successes', () => {
    if (Cypress.env('CY_MODE') === 'headed') {
    it('passes', () => { // Login needed to add a stemma. Skip in headless mode for now.
        const stemma_added_marker = 'Stemma added';
        const stemma_deleted_marker = 'Deleted';
        // initially the message panel should exist without text content
        cy.get('#message-console-text-panel').as('messageconsole');
        cy.get('@messageconsole').should('have.value', '');
        // Add a stemma (the default example stemma)
        cy.get('#add-stemma-button-link').click();
        cy.get('#save-stemma-button-link').wait(500).click();
        // when a stemma is saved it should have a message with the text "Stemma added"
        cy.get('@messageconsole').contains(stemma_added_marker);
        // delete the added stemma in order to reset the db
        cy.get('#delete-stemma-button-link').click();
        cy.get('.modal-content').contains('button', 'Yes, delete it').wait(500).click();
        cy.get('#modalDialog').should('not.be.visible');
        cy.get('@messageconsole').contains(stemma_deleted_marker);

        // assert the content in the message console stays there also upon clicking on another tradition.
        cy.get('ul#traditions-list > li').eq(-1).wait(500).click(); // ultimate tradition
        cy.get('@messageconsole').should('be.visible').contains(stemma_deleted_marker);
        cy.get('@messageconsole').contains(stemma_added_marker);
    });
    }
});
