/*  A guest (i.e. a visitor who has not signed in) should
    - not see any private test tradition listed in the toc,
    - not be able to upload a tradition:
        - not see the feather-plus-circle (next to the toc header 'TEXT DIRECTORY'),
    - not be able to delete any tradition:
        - not see the 'Delete' button,
    - not be offered to 'Edit Collation',
    - not be offered to edit Properties.

    - see all public test traditions listed in the toc,
    - be able to download 'Tradition' (e.g. Notre besoin), TBD
    - be able to download 'Stemma' (e.g. of Notre besoin), TBD
    - be able to 'Examine Stemma' (e.g. of Notre besoin), TBD

A guest should further
    - see the heading 'Stemmaweb — a collection of tools for the analysis of collated texts'
    - be offered to 'Sign in' (there will be another file to test this feature)
    - be able to navigate to the 'About' page 'https://stemmaweb.net/' (link will change, TBD)
*/
/*  test users & traditions (https://github.com/tla/stemmaweb/pull/152):
...
Tests for Feat/157 user auth (PR #235), related to 'guest':
- Guest sees only public traditions
- Guest may not change any metadata (ideally the edit button wouldn't be there, but that isn't in this code)
 */

// TODO: When role user and admin tests are completed, check guest privileges to adapt or complete if necessary.

import test_traditions from '../../fixtures/test_traditions.json';

beforeEach(() => {
  cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
  test_traditions.sort((tradition_a, tradition_b) =>
    tradition_a.title.localeCompare(tradition_b.title)
  );

  // assert guest role: not logged in
  cy.get('header').as('header');
  cy.get('@header').contains('a', 'Sign in').should('be.visible');
  // issue#254 Before signing in, the stemmaweb-navigation header should say "Welcome, Guest", "Welcome as Guest", or alike, instead of "Logged in as Guest"
  // cy.get('@header').should('not.contain', 'Logged in'); // Default: 'Logged in as Guest'
  cy.get('@header').should('not.contain', 'Sign out');
});

const test_traditions_public = test_traditions.filter(
  ({ access }) => access === 'Public'
);

// Guests' rights are restricted to ...

// ToDo: close github issues  #170, #157, #155 when tests are passing for all roles.
// Test for Feat/157 user auth (PR #235), related to 'guest':
describe('Cross-check: guest sees only public traditions listed in the toc', () => {
  it('passes', () => {
    // the number of displayed traditions is equal to the number of public traditions
    // no separation bar btw own and others' traditions, all are othres'
    cy.get('ul#traditions-list')
      .children()
      // .find('.folder-icon') // no separation line btw own and others' traditions or public and private
      .should('have.length', test_traditions_public.length);

    test_traditions.forEach((tradition) => {
      if (tradition.access == 'Public') {
        // It should be the public traditions' titles which are displayed
        cy.log('title: ' + tradition.title);
        cy.get('#traditions-list')
          .contains(tradition.title)
          .should('be.visible');
      } else if (tradition.access == 'Private') {
        cy.get('#traditions-list')
          .contains(tradition.title)
          .should('not.exist');
      } else {
        throw new Error("The tradition is neither 'Private' nor 'Public'!");
      }
    });
  });
});

describe('A guest should not be able to upload a tradition', () => {
  it('passes', () => {
    cy.contains('h6', 'Text directory')
      .find('svg.feather-plus-circle')
      .parents('a')
      .as('addTraditionBtn');
    cy.get('@addTraditionBtn').should('have.class', 'greyed-out');
    cy.get('@addTraditionBtn').click();
    // assert that the 'Upload a new collation' modal is not visible
    // cy.contains('add-tradition-modal', 'Upload a new collation')
    cy.get('add-tradition-modal').should('exist').and('not.be.visible'); // a place-holder only
  });
});

describe('A guest should not be offered or able to delete any tradition', () => {
  it('passes', () => {
    const label = 'Delete';
    // not even before clicking on a tradition in the navigation bar
    cy.assertPointerEventsDisabledForLabel(label);
    // going through all traditions in the navigation bar
    test_traditions_public.forEach(() => {
      cy.assertPointerEventsDisabledForLabel(label);
    });
  });
});

describe('A guest should not be offered or able to "Edit Collation" of any tradition', () => {
  it('passes', () => {
    const label = 'Edit Collation';
    // not even before clicking on a tradition in the navigation bar
    cy.assertPointerEventsDisabledForLabel(label);
    // going through all traditions in the navigation bar
    test_traditions_public.forEach(() => {
      cy.assertPointerEventsDisabledForLabel(label);
    });
  });
});

// Feat/157 user auth (PR#235)
// ToDo: close github issues  #170 and #157 when tests are passing for all roles.
describe('Guest may not change any metadata (Edit properties)', () => {
  it('passes', () => {
    // Guest sees only all public traditions -- asserted separately, above
    // assert the 'Edit properties' modal is not visible
    test_traditions_public.forEach((tradition) => {
      cy.log('title: ' + tradition.title);
      // Guest may not change metadata on traditions (ideally the edit button wouldn't be there...)
      // the tradition is visible but not editable for a guest, opened lock sign
      cy.get('ul#traditions-list')
        .contains(tradition.title)
        .should('be.visible')
        .wait(300)
        .click();
      cy.get('property-table-view').as('properties-table');
      cy.get('@properties-table')
        .should('be.visible')
        .find('edit-properties-button')
        .find('a')
        .should('have.class', 'greyed-out');
      // upon click the 'Edit properties' modal should not become visible, so the properties are not editable
      cy.get('@properties-table').find('edit-properties-button').click();
      // assert the 'Edit properties' modal is not displayed
      cy.contains('#modalDialogLabel', 'Edit properties').should('not.exist'); // does not exist for a guest
      // .should('exist').and('not.be.visible') // for a user it exists with a dummy text but is not visible
    });
  });
});

// A guest should be able to ...

describe('A guest should be offered to download a public "Tradition"', () => {
  it('passes', () => {
    const label = 'Tradition';
    // asserted in another test: private traditions are not visible for a guest
    test_traditions_public.forEach((tradition) => {
      cy.log('title: ' + tradition.title);
      // click through all traditions
      cy.get('#traditions-list')
        .contains(tradition.title)
        .wait(300)
        .click();
      cy.get('#stemma-buttons')
        .contains(label)
        .should('be.visible')
        .and('be.enabled');
      // TODO test functionality when coded
    });
  });
});

// A guest should be offered for each stemma of a public tradition,
// and only when a stemma is available, to:
// select stemma, see preview
// see the respective Stemma identifier(, see its correct Witnesses ?),
// 'Examine Stemma', and 'Download Stemma' in all available formats.
// TODO, issue: disable or hide certain elements when no stemma available, etc. see below

// Examine Stemma: tabular representation of variants and how they affect the stemma
describe('A guest should be offered to "Examine Stemma" of a public tradition only for any of its stemmata', () => {
  it.skip('under construction', () => { // the feature is not implemented yet, it is being re-established
    const label_examine = 'Examine Stemma';
    const label_download_stemma = 'Stemma';
    // Private traditions should not be visible for a guest: is verified in another test
    test_traditions_public.forEach((tradition) => {
      // click through all public traditions
      cy.log('title: ' + tradition.title);
      // cy.wait(1000);
      cy.get('#traditions-list').contains(tradition.title).click();

      // click through each of its stemmata // select stemma
      if (Array.isArray(tradition.stemmata) && tradition.stemmata.length) {
        // TODO (issue?), check if it makes a problem: re-clicking (manually) on a selector_circle which is active
        // hides the respective stemma svg on all immediate further clicks. Strangely, passes the test.

        cy.get('#stemma_selector')
          .children()
          .each(($stemmaselector, idx) => {
            $stemmaselector.find('svg').click(); // circle shaped selectors at the bottom of the page
            cy.log(
              'idx, tradition.stemmata[idx]: ' +
                idx +
                ', ' +
                tradition.stemmata[idx]
            );
            cy.wait(3000); // stemma svg fades in
            // see preview
            cy.get('#graph').find('svg').should('be.visible');
            // see the respective Stemma identifier
            cy.get('#tradition_info')
              .contains('tr', 'Stemma')
              .as('stemma_row')
              .should('be.visible');
            // TODO: check it is the correct stemma identifier
            // cy.get('@stemma_row').contains(tradition.stemmata[idx]); // TODO: Problem with stemma id 'RHM 1641561271_0', is never asserted (Matthew 401). Others are ok.

            // TODO?: assert the stemma's correct Witnesses

            // 'Examine Stemma'
            cy.get('#stemma-buttons')
              .contains(label_examine)
              .should('be.visible')
              .and('be.enabled');
            // 'Download Stemma' in all available formats.
            cy.get('#stemma-buttons')
              .find('#stemma_image_downloadbtn')
              .contains(label_download_stemma)
              .as('download_stemma_button')
              .should('be.visible')
              .and('be.enabled');
            cy.get('@download_stemma_button').click();
            // cy.get('@download_stemma_button').parent().find('a').should('have.length', 3); // TODO: which formats are availabel?
            // TODO: test functionality
          });
      } else {
        // if no stemma is available:
        // no preview selector
        cy.get('#stemma_selector').find('svg').should('not.exist');
        // no preview
        cy.get('#graph').find('svg').should('not.exist');
        // no 'Stemma' identifier in the properties table
        cy.get('#tradition_info').contains('Stemma').should('not.exist');

        // no 'Examine Stemma' offered
        // cy.get('#stemma-buttons').contains(label_examine); // TODO remove line, write issue
        cy.get('#stemma-buttons')
          .contains('TODO: ' + label_examine)
          .should('not.exist'); // TODO eventually: remove and use next line instead
        // cy.get('#stemma-buttons').contains(label_examine).should('not.be.enabled'); // or .should('not.exist')

        // no 'Download Stemma' offered
        // cy.get('#stemma-buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma); // TODO remove line, write issue
        cy.get('#stemma-buttons')
          .find('#stemma_image_downloadbtn')
          .contains('TODO: ' + label_download_stemma)
          .should('not.exist'); // TODO eventually: remove and use next line instead
        // cy.get('#stemma-buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma).should('not.be.enabled'); // or .should('not.exist')
      }
    });
  });
});

// issue#253: "Download tradition" should be implemented for different formats by api calls
describe('A guest should be offered to "Download tradition" of a public tradition in different formats', () => {
  it.skip('under construction', () => { // the feature is not implemented yet
  });
});

// issue#252: Stemma download file should have the same name as the stemma
// issue#255: Make sure the right stemma is downloaded and traditions without stemma don't offer "Download stemma"
describe('A guest should be offered to "Download Stemma" of a public tradition only for any of its stemmata', () => {
  it.skip('under construction', () => { // the feature is not implemented yet
  });
});

// A guest should see ...

describe('A guest should see the heading "Stemmaweb — a collection of tools for the analysis of collated texts"', () => {
  it('passes', () => {
    cy.get('header')
      .contains(
        'a',
        'Stemmaweb — a collection of tools for the analysis of collated texts'
      )
      .should('be.visible');
  });
});

describe('A guest should be offered to "Sign in" (the actual sign-in behaviour is examined in another test)', () => {
  it('passes', () => {
    cy.get('header').contains('a', 'Sign in').should('be.visible');
  });
});

describe('A guest should be offered to navigate to the "About" page', () => {
  it('passes', () => {
    cy.get('header').contains('a', 'About').should('be.visible');
    // TODO: check the right address is linked and visited
  });
});
