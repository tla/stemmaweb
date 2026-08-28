/*  tests with role admin for "View stammata"

PR#294 stemma selector:
  clicking open the dropdown and clicking on a stemma/section should:
    select the right stemma/section;
    should close the list;
    and the title of the stemma or section should be shown to the right of the dropdown menu.
  after adding a stemma, the dropdown includes also the new stemma
  after deleting a stemma, it is removed from the dropdown
  after editing a stemma, it is still in the dropdown, with the updated title if applicable

stemma buttons:
  add, edit, delete stemma

stemma container:
  stemma has nodes and edges
  ...

*/

import users_all from '../../fixtures/users.json';
import test_traditions from '../../fixtures/test_traditions_mini.json';

const users_admin = users_all.filter(({ role }) => role === 'admin');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // for "equals" instead of "contains"

// if (Cypress.browser.isHeaded) {
  // skip when in headless mode until headless login is fixed

  // any tests are to be carried out for each of the users who have the role 'admin'
  users_admin.forEach( (admin) => {
    const test_traditions_own_private = test_traditions.filter(
      ({ owner, access }) => owner === admin.username && access === 'Private'
    );
    const test_traditions_own_public = test_traditions.filter(
      ({ owner, access }) => owner === admin.username && access === 'Public'
    );
    const test_traditions_others_public = test_traditions.filter(
      ({ owner, access }) => owner !== admin.username && access === 'Public'
    );
    const test_traditions_others_private = test_traditions.filter(
      ({ owner, access }) => owner !== admin.username && access === 'Private'
    );


    // PR#294 stemma selector
    describe('Choosing a stemma from a dropdown menu as admin ' + admin.username, () => {
      // reset db is called before each it() test from within cypress/support/e2e.js
      // test for admin@example.org
      beforeEach(() => {
        cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
        test_traditions.sort((tradition_a, tradition_b) =>
          tradition_a.title.localeCompare(tradition_b.title)
        );
        cy.loginViaUi(admin); // first step in users_admin.forEach((admin) => { ...
      });

      afterEach(() => {
        cy.logoutViaUi(); // last step in users_admin.forEach((admin) => { ...
        cy.log('end of test for this admin')
      });

      it('asserts admin can select a stemma', () => {
        test_traditions.forEach((tradition) => {
          cy.log('title: ' + tradition.title);
          const text = tradition.title;
          cy.get('ul#traditions-list li .tradition-list-item')
            .contains(new RegExp(`^${escapeRegExp(text)}$`)) // exact match
            .as('tradition_title_elem_in_nav')
          cy.get('@tradition_title_elem_in_nav')
            .should('be.visible')
            .click();

          // depending on the tradition, the stemma container is either empty or has a dropdown with one stemma pre-selected.
          // cy.log('typeof tradition.stemmata, length: ' + typeof tradition.stemmata + ', ' + tradition.stemmata.length)
          if (tradition.stemmata.length === 0) { // no stemma in test json
            cy.get('#stemma-selectors').children().should('not.exist');
          } else {
            cy.get('#stemma-selectors').find('button').should('exist');

            // stemma selected correctly:
            // text of the dropdown is "Select stemma"
            // clicking on dropdown unfolds the select list with all stemmata of the active tradition
            // the stemma title to the right of the dropdown title equals to the selected stemma in the select list
            // clicking through the next stemmata 
            //    updates the chosen stemma title to the right of the dropdown
            //    and closes the dropdown
            // after adding a stemma, the dropdown includes also the new stemma
          }

        });
      });

    })
  })
// }
