/*  User privileges (anyone with role 'user'):
    Users except admins should only be allowed to see and manipulate their own traditions.
    They should not be able to see other users' traditions, nor edit or delete them.
      partially DONE: tests for Edit properties; TODO when feature is imlemented: Assert 'Save' edited properties.
      TODO: tests for Edit collation, Delete, Download, etc (re. roles user and admin)

    https://github.com/tla/stemmaweb/pull/235
    - User sees only public and their own traditions
    - User may change metadata on their own tradition // i.e. Edit properties
    - User may not change metadata on traditions they don't own (ideally the edit button wouldn't be there...)
*/

import users_all from '../../fixtures/users.json';
import test_traditions from '../../fixtures/test_traditions.json';

const users_user = users_all.filter(({ role }) => role === 'user');

/* Steps overview
  for each user:
    reset db // called before each it() test from within cypress/support/e2e.js
    log in
    assert number of visible traditions is correct
    assert all the right traditions are displayed in the tradition list
    traditions are listed in the right order
  each own private+public tradition:
    assert the 'Edit properties' modal is visible
    assert user can edit, delete, download, etc. his own traditions
    assert the list of own traditions in the toc is followed by a separator, followed by any other traditions
  each others' public tradition:
    assert 'Edit properties' is disabled
    assert edit tradition, delete, download, etc. is disabled
  each others' private tradition:
    should not be visible
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

    // Feat/157 user auth (PR#235) (re. guest, user, admin)
    describe('User authentication and role behaviour for user ' + user.username, () => {
      // reset db is called before each it() test from within cypress/support/e2e.js
      // test for both users: user@example.org and benutzer@example.org
      beforeEach(() => {
        cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
        test_traditions.sort((tradition_a, tradition_b) =>
          tradition_a.title.localeCompare(tradition_b.title)
        );
        cy.loginViaUi(user); // first step in users_user.forEach((user) => { ...
      });

      afterEach(() => {
        cy.logoutViaUi(); // last step in users_user.forEach((user) => { ...
        cy.log('end of test for this user')
      });

      it('asserts the user sees only public and their own traditions, and can only edit own traditions', () => {

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

        // assert all the right traditions are displayed in the tradition list
        // assert the 'Edit properties' modal is visible
        // assert user can only edit his own traditions
        test_traditions.forEach((tradition) => {
          cy.log('title: ' + tradition.title);
          // User may change metadata on their own tradition
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
            // test_traditions.forEach: if own trad, a following sibling should contain descendant with .list-separator,
            // else: no following sibling should contain the separator.
            // the separator comes if there are any own traditions.
            // if only others trads, there is no separator.
            cy.get('@tradition_title_elem_in_nav')
              .closest('li')
              .nextAll()
              .find('.list-separator')
              .should('exist');
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

            // in cypress/support/commands.js 'editProperties'
            // when the feature is implemented for role 'user':
            // TODO: assert save any changes passes
            cy.editProperties([
              'Edit properties',
              user.username,
              user.role,
              tradition
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
              .as('tradition_title_elem_in_nav')
            // test_traditions.forEach: if own trad, a following sibling should contain descendant with .list-separator,
            // else: no following sibling should contain the separator.
            // the separator comes if there are any own traditions.
            // if only others trads, there is no separator.
            cy.get('@tradition_title_elem_in_nav')
              .closest('li')
              // .nextAll() // fails when no following siblings // shouldnt happen according to docs.
              // .find('.list-separator')
              // .should('not.exist');
              .nextAll(':has(.list-separator)')
              .should('not.exist');
            cy.get('@tradition_title_elem_in_nav')
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
        test_traditions_others_public.sort((tradition_a, tradition_b) => tradition_a.title.localeCompare(tradition_b.title)
        );
        cy.wrap(test_traditions_others_public).then(data => {
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
