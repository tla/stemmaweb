/*  User priviledges:
    Users except admins should only be allowed to see and manipulate their own traditions.
        They should not be able to see other users' traditions, nor edit or delete them.

    - User sees only public and their own traditions
    - User may change metadata on their own tradition
    - User may not change metadata on traditions they don't own (ideally the edit button wouldn't be there...)

    Should work for both, 'user' and 'benutzer', i.e. for any who have the role 'user'.
*/

import users from '../../fixtures/users.json';
import test_traditions from '../../fixtures/test_traditions.json';

// const users = ...    // TODO: test for all with role==user: user@example.org and benutzer@example.org.
const user = users.filter(({username}) => username === 'user@example.org')[0];
const test_traditions_user_private = test_traditions.filter(({ owner, access }) => owner === user.username && access === 'Private'); // 2: Florilegium, Legend
const test_traditions_user_public = test_traditions.filter(({ owner, access }) => owner === user.username && access === 'Public'); // 1: Notre besoin
const test_traditions_others_public = test_traditions.filter(({ owner, access }) => owner !== user.username && access === 'Public'); // 1: John verse
// const count_traditions_invisible_for_user = test_traditions.filter(({ owner, access }) => owner !== user.username && access !== 'Public').length; // 3: Verbum, checked, Arabic
// const count_traditions_all = test_traditions.length; // 7
const  count_traditions_listed_user = test_traditions_user_private.length + test_traditions_user_public.length + test_traditions_others_public.length;
// assert that user_private(2) + user_public(1) + others_public(1) + invisible_for_user equal(3) to total traditions(7).

if (Cypress.browser.isHeaded) { // skip when in headless mode

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.viewport(1600, 900);
    test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
    cy.loginViaUi(user);
});

afterEach(() => {
    cy.logoutViaUi();
});

// Feat/157 user auth (PR#235)
describe('User sees only public and their own traditions', () => {
    it('passes', () => {
        /* // count traditions filtered by role, owner, access
        cy.log('count_traditions_all: ' + count_traditions_all) // 7
        cy.log('count_traditions_user_private: ' + test_traditions_user_private.length) // 2
        cy.log('count_traditions_user_public: ' + test_traditions_user_public.length) // 1
        cy.log('count_traditions_others_public: ' + test_traditions_others_public.length) // 1
        cy.log('count_traditions_invisible_for_user: ' + count_traditions_invisible_for_user) // 3
        cy.log('count_traditions_visible_for_user: ' + (count_traditions_all - count_traditions_invisible_for_user)) // 7-3=4
        cy.log('count_traditions_listed_user:' + count_traditions_listed_user) */

        // logged in as a specific user
        // assert the number of visible traditions is that of the own ones + the orthers' public ones
        // one of the list elements may just contain a separating line in the <li> and no .folder-icon
        cy.get('ul#traditions-list').children().find('.folder-icon').should('have.length', count_traditions_listed_user);

        // assert all the right traditions are displayed in the tradition list
        // assert the 'Edit properties' modal is visible
        // assert user can only edit his own traditions
        test_traditions.forEach((tradition) => {
            cy.log("title: " + tradition.title);
            /* if (tradition.owner === user.username && tradition.access === 'Private')
                {   // visible and editable, closed lock sign
                    cy.get('ul#traditions-list').contains(tradition.title).should('be.visible').click();
                    // the edit icon should be visible, not greyed out, on click the editing interface should appear.
                    cy.get('property-table-view').as('properties-table')
                    cy.get('@properties-table').find('edit-properties-button').find('a').should('not.have.class', 'greyed-out')
                    // cy.contains('#modalDialogLabel', 'Edit properties').parents('div.modal-dialog').find('button.btn-close').click()
                    // cy.contains('#modalDialogLabel', 'Edit properties').should('not.exist')
                }
            else */ if (tradition.owner === user.username && tradition.access === 'Public')
                {   // visible and editable, opened lock sign
                    cy.get('ul#traditions-list').contains(tradition.title).should('be.visible').click();
                    cy.get('property-table-view').as('properties-table')
                    cy.get('@properties-table').find('edit-properties-button').find('a[aria-label="Edit tradition properties"]').should('not.have.class', 'greyed-out')
                    // .parents('edit-properties-button).click() // cypress does not like this...
                    cy.get('@properties-table').find('edit-properties-button').click()
                    // close the modal
                    cy.clickModalButton(['Edit properties', 'Close'])
                }
            /* else if (tradition.owner !== user.username && tradition.access === 'Private')
                {   // not visible or editable for this user
                    cy.get('ul#traditions-list').contains(tradition.title).should('not.exist'); 
                    // 'Edit properties' is not reachable anyways
                }
            else if (tradition.owner !== user.username && tradition.access === 'Public')
                {   // visible but not editable for this user, opened lock sign
                    cy.get('ul#traditions-list').contains(tradition.title).should('be.visible').click();
                    cy.get('property-table-view').as('properties-table')
                    cy.get('@properties-table').find('edit-properties-button').find('a').should('have.class', 'greyed-out')
                }
            else { // should not reach here
                throw new Error("Not all tradition types for the user are covered in the test!")
                // role admin: check in role_admin tests.
            } */
        });

        // TODO: test not only for user@example.org but also for benutzer@example.org.
    });
});

}