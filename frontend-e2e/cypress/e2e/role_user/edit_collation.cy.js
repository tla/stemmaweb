/*  Edit Collation tests with role 'user'
*/

import users_all from '../../fixtures/users.json';
import test_traditions from '../../fixtures/test_traditions.json';

const user = users_all.filter(
  ({ username }) => username === 'user@example.org'
)[0];

/* Steps overview
  test only for user@example.org because only this user has traditions with 1, 2 and 3 sections; benutzer's traditinos have only 1 section.
    reset db // called before each it() test from within cypress/support/e2e.js
    log in
    assert Edit Collation entrance steps (to be defined: highlighting and unfolding of sections, enabling Edit/View Collation button)
  each own private+public tradition:
    assert Edit Collation functionality
      assert graph and accordingly minimap display
      assert minimap movement sychronous to graph movement
  each others' public tradition:
    assert Edit Collation is disabled
    assert View Collation is enabled
  each others' private tradition:
    tested in user_privileges: assert they are not visible
  log out
 */


if (Cypress.browser.isHeaded) {
  // skip when in headless mode until headless login is fixed

  const test_traditions_own_private = test_traditions.filter(
    ({ owner, access }) => owner === user.username && access === 'Private'
  );
  const test_traditions_own_public = test_traditions.filter(
    ({ owner, access }) => owner === user.username && access === 'Public'
  );
  const test_traditions_others_public = test_traditions.filter(
    ({ owner, access }) => owner !== user.username && access === 'Public'
  );

  describe('User ' + user.username + ' can Edit Collation which he/she owns, only', () => {
    beforeEach(() => {
      cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
      cy.viewport(1600, 900);
      test_traditions.sort((tradition_a, tradition_b) =>
        tradition_a.title.localeCompare(tradition_b.title)
      );
      cy.loginViaUi(user); // fist step in users_user.forEach((user) => { ...
    });

    afterEach(() => {
      cy.logoutViaUi(); // last step in users_user.forEach((user) => { ...
      cy.log('end of test for this user')
    });

    it('passes', () => {

      // assert user can only edit his own collations
      test_traditions.forEach((tradition) => {
        cy.log('title: ' + tradition.title);
        // user's own private and public traditions
        // Edit Collation
        if (
          tradition.owner === user.username &&
          (
            tradition.access === 'Private' ||
            tradition.access === 'Public'
          )
        ) {
          // visible and editable, closed lock sign
          cy.get('ul#traditions-list')
            .contains(tradition.title)
            .as('tradition_title_elem_in_nav')
        }
        // public traditions the user doesn't own
        // View Collation but not Edit Collation
        else if (
          tradition.owner !== user.username &&
          tradition.access === 'Public'
        ) {
          // visible but not editable for this user, opened lock sign
          // cy.get('ul#traditions-list')
          //   .contains(tradition.title)
          //   .as('tradition_title_elem_in_nav')
        }
        // private traditions the user doesn't own
        else if (
          tradition.owner !== user.username &&
          tradition.access === 'Private'
        ) {
          // not visible or editable for this user
          cy.get('ul#traditions-list')
            .contains(tradition.title)
            .should('not.exist');
        } else {
          // should not reach here
          throw new Error(
            'Not all tradition types for the user are covered in the test!'
          );
        }
      });
    });

  })
}
