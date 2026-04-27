/*  Admin privileges (anyone with role 'admin'):
    Admins should be allowed to see and manipulate their own and others' traditions.
    Assert 'Save' edited properties.
    Tests for Edit collation, Delete, Download, etc (re. roles user and admin)

    https://github.com/tla/stemmaweb/pull/235
    The following things should now be testable:
    - Admin sees all traditions
    - Admin may change metadata on any tradition

*/

import users_all from '../../fixtures/users.json';
import test_traditions from '../../fixtures/test_traditions.json';

const users_admin = users_all.filter(({ role }) => role === 'admin');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // for "equals" instead of "contains"

/* Steps overview
  for each user:
    reset db // called before each it() test from within cypress/support/e2e.js
    log in
    assert number of visible traditions is correct
    assert all the right traditions are displayed in the tradition list
    traditions are listed in the right order
  each own private+public tradition
  as well as others' private and public traditions
    assert the 'Edit properties' modal is visible
    assert admin can edit, delete, download, etc. own and others' traditions
    assert the list of own traditions in the toc is followed by a separator, followed by any other traditions
  log out
 */


if (Cypress.browser.isHeaded) {
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

    // Feat/157 user auth (PR#235) (re. guest, user, admin)
    describe('User authentication and role behaviour for admin ' + admin.username, () => {
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

      it('asserts admin can see and edit own and others\' traditions', () => {

        // Admin sees all traditions: own and others' public and private.
        cy.get('ul#traditions-list')
          .children()
          .find('.folder-icon')
          .should(
            'have.length',
            test_traditions_own_private.length +
              test_traditions_own_public.length +
              test_traditions_others_public.length +
              test_traditions_others_private.length
        );

        // assert all traditions are displayed in the tradition list
        // assert the 'Edit properties' modal is visible
        // assert admin can edit own and others' traditions
        test_traditions.forEach((tradition) => {
          cy.log('title: ' + tradition.title);
          // admin may change metadata on their own and others' traditions
          const text = tradition.title;
          // visible and editable, closed lock sign
          cy.get('ul#traditions-list li .tradition-list-item')
            .contains(new RegExp(`^${escapeRegExp(text)}$`)) // exact match
            .as('tradition_title_elem_in_nav')
          cy.get('@tradition_title_elem_in_nav')
            .should('be.visible')
            .click();
          // the edit icon should be visible, not greyed out, on click the editing interface should appear.
          cy.get('property-table-view').as('properties-table');
          cy.get('@properties-table')
            .find('edit-properties-button')
            .find('a')
            .should('not.have.class', 'greyed-out');
          // .parents('edit-properties-button).click() // cypress does not like this...
          cy.get('@properties-table').find('edit-properties-button').click();

          cy.editProperties([
            'Edit properties',
            admin.username,
            admin.role,
            tradition
          ]);
        });
      });

      // own and others' traditions are each sorted alphabetically, before and after the separator
      // TODO: consider the case, own or others' traditions array to be empty

      // own traditions:
      it('asserts pre-separator tradition titles equal expected titles', () => {
        const test_traditions_own = test_traditions_own_private.concat(test_traditions_own_public)
          .sort((tradition_a, tradition_b) => tradition_a.title.localeCompare(tradition_b.title)
        );
        cy.wrap(test_traditions_own).then(data => {
          const expectedTitles = data.map(d => d.title);
          cy.log('test_traditions_own: ' + expectedTitles)

          cy.get('#traditions-list > li:has(.list-separator)')
            .prevAll('li')
            .find('span.tradition-nav-name')
            .then($spans => {
              const titles = [...$spans].map(el => el.textContent.trim())//.reverse();
              cy.log('titles in toc: ' + titles)
              expect(titles, 'titles before separator').to.deep.equal(expectedTitles);
            });
        });
      });

      // others' traditions:
      it('asserts post-separator tradition titles equal expected titles', () => {
        const test_traditions_others = test_traditions_others_private.concat(test_traditions_others_public)
          .sort((tradition_a, tradition_b) => tradition_a.title.localeCompare(tradition_b.title)
        );
        cy.wrap(test_traditions_others).then(data => {
          const expectedTitles = data.map(d => d.title);
          cy.log('test_traditions_others_public: ' + expectedTitles)

          cy.get('#traditions-list > li:has(.list-separator)')
            .nextAll('li')
            .find('span.tradition-nav-name')
            .then($spans => {
              const titles = [...$spans].map(el => el.textContent.trim())//.reverse();
              cy.log('titles in toc: ' + titles)
              expect(titles, 'titles before separator').to.deep.equal(expectedTitles);
            });
        });
      });
    })
  })
}
