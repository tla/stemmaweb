/*  User priviledges:
    Users except admins should only be allowed to see and manipulate their own traditions.
    They should not be able to see other users' traditions, nor edit or delete them.

    https://github.com/tla/stemmaweb/pull/235
    - User sees only public and their own traditions
    - User may change metadata on their own tradition
    - User may not change metadata on traditions they don't own (ideally the edit button wouldn't be there...)

    Should work for both, 'user' and 'benutzer', i.e. for any who have the role 'user'.
*/

import users_all from '../../fixtures/users.json';
import test_traditions from '../../fixtures/test_traditions.json';

const users_user = users_all.filter(({ role }) => role === 'user');

/* for each user:
    reset db
    log in
    assert number of visible traditions is correct
    assert all the right traditions are displayed in the tradition list
    to do when implemented: traditions are listed in the right order
  each own private+public tradition:
    assert the 'Edit properties' modal is visible
    assert user can only edit his own traditions
  each others' public tradition:
    assert 'Edit properties' is disabled
    assert edit is disabled
  each others' private tradition:
    should not be visible

  to do: add tests for delete, download, etc for each group of roles
  log out
 */


if (Cypress.browser.isHeaded) {
  // skip when in headless mode until headless login is fixed

  // any tests are to be carried out for each of the users who have the role 'user'
  users_user.forEach( (user) => {
    const test_traditions_own_private = test_traditions.filter(
      ({ owner, access }) => owner === user.username && access === 'Private'
    );
    const test_traditions_own_public = test_traditions.filter(
      ({ owner, access }) => owner === user.username && access === 'Public'
    );
    const test_traditions_others_public = test_traditions.filter(
      ({ owner, access }) => owner !== user.username && access === 'Public'
    );

    // Feat/157 user auth (PR#235)
    describe('User authentication and role behaviour for user ' + user.username, () => {
    // describe('tests for user ' + user.username, () => {
      // test for both users: user@example.org and benutzer@example.org
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

        // User sees only public and their own traditions
        cy.get('ul#traditions-list')
          .children()
          .find('.folder-icon')
          .should(
            'have.length',
            test_traditions_own_private.length +
              test_traditions_own_public.length +
              test_traditions_others_public.length
        );

        // TODO when https://github.com/tla/stemmaweb/issues/245 (The tradition list should be devided into the current user's/admin's traditions and those of others) is solved:
        // The tradition list should be devided into the current user's/admin's traditions and those of others.
        // Own traditions should be listed first (private and public ones),
        // separated from and followed by those of others
        // (users can view others' public traditions, admins can view and edit others' public and private traditions).
        // Otherwise it is hard for a user to see at first glance which traditions are editable, namely only his/hers.
        cy.traditionDivider(user)

        // assert all the right traditions are displayed in the tradition list
        // assert the 'Edit properties' modal is visible
        // assert user can only edit his own traditions
        test_traditions.forEach((tradition) => {
          cy.log('title: ' + tradition.title);
          // User may change metadata on their own tradition
          if (
            tradition.owner === user.username &&
            tradition.access === 'Private'
          ) {
            // visible and editable, closed lock sign
            cy.get('ul#traditions-list')
              .contains(tradition.title)
              .should('be.visible')
              .click();
            // the edit icon should be visible, not greyed out, on click the editing interface should appear.
            cy.get('property-table-view').as('properties-table');
            cy.get('@properties-table')
              .find('edit-properties-button')
              .find('a')
              .should('not.have.class', 'greyed-out');
            cy.get('@properties-table').find('edit-properties-button').click();

            cy.editProperties([
              'Edit properties',
              user.username,
              user.role,
              tradition.title,
              tradition.owner,
              tradition.access
            ]);
          }
          // User may change metadata on their own tradition
          else if (
            tradition.owner === user.username &&
            tradition.access === 'Public'
          ) {
            // visible and editable, opened lock sign
            cy.get('ul#traditions-list')
              .contains(tradition.title)
              .should('be.visible')
              .click();
            cy.get('property-table-view').as('properties-table');
            cy.get('@properties-table')
              .find('edit-properties-button')
              .find('a[aria-label="Edit tradition properties"]')
              .should('not.have.class', 'greyed-out');
            // .parents('edit-properties-button).click() // cypress does not like this...
            cy.get('@properties-table').find('edit-properties-button').click();

            cy.editProperties([
              'Edit properties',
              user.username,
              user.role,
              tradition.title,
              tradition.owner,
              tradition.access
            ]);
          }
          // User sees only public and their own traditions
          else if (
            tradition.owner !== user.username &&
            tradition.access === 'Private'
          ) {
            // not visible or editable for this user
            cy.get('ul#traditions-list')
              .contains(tradition.title)
              .should('not.exist');
            // 'Edit properties' is not reachable anyways
          }
          // User may not change metadata on traditions they don't own (ideally the edit button wouldn't be there...)
          else if (
            tradition.owner !== user.username &&
            tradition.access === 'Public'
          ) {
            // visible but not editable for this user, opened lock sign
            cy.get('ul#traditions-list')
              .contains(tradition.title)
              .should('be.visible')
              .click();
            cy.get('property-table-view').as('properties-table');
            cy.get('@properties-table')
              .find('edit-properties-button')
              .find('a')
              .should('have.class', 'greyed-out');
            // upon click the 'Edit properties' modal should not become visible, so the proerties are not editable
            cy.get('@properties-table').find('edit-properties-button').click();
            // assert the 'Edit properties' modal is not displayed
            cy.contains('#modalDialogLabel', 'Edit properties')
              .should('exist') // contains dummy text (not the tradition's properties)
              .and('not.be.visible');
          } else {
            // should not reach here
            throw new Error(
              'Not all tradition types for the user are covered in the test!'
            );
            // role admin: check in role_admin tests.
          }
        });
      });

    })
  })
}
