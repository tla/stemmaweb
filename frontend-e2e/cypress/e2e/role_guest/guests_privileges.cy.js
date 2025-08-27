/*  A guest (i.e. a visitor who has not signed in yet) should,
as far as the user interface is concerned (functionalities to be verified in separate tests) and
as far as the public traditions are concerned,

    - not see any private test tradition listed in the toc,
    - not be able to upload a tradition:
        - not see the feather-plus-circle (next to the toc header 'TEXT DIRECTORY'),
        - ? not be able to add a tradition in another way,
    - not be able to delete any tradition:
        - not see the 'Delete' button,
        - ? not be able to delete a tradition in another way,
    - not be offered to 'Edit Collation',
    - not be offered to edit Properties.

    - see all public test traditions listed in the toc,
    - be able to download 'Tradition' (e.g. Notre besoin),
    - be able to download 'Stemma' (e.g. of Notre besoin),
    - be able to 'Examine Stemma' (e.g. of Notre besoin),

A guest should further
    - see the heading 'Stemmaweb — a collection of tools for the analysis of collated texts',
    - be offered to 'Sign in' (there will be another file to test this feature)
    - be able to navigate to the 'About' page 'https://stemmaweb.net/'.
*/

/*  test users & traditions (https://github.com/tla/stemmaweb/pull/152):

changes in https://github.com/tla/stemmaweb/pull/167:
set 'Notre besoin' and 'John verse' to be public;
'Matthew 401' stays private in line with existing data.


user@example.org (pw UserPass) has three traditions

    Notre besoin, public
    Florilegium, private (with multiple sections)
    Legend fragment, private (with multiple sections)

benutzer@example.org (pw BenutzerKW) has three traditions

    Matthew 401, private
    John verse, public
    Arabic snippet, private

admin@example.org (pw AdminPass) has one tradition

    Verbum uncorrected, private

Tests for Feat/157 user auth (PR #235), related to 'guest':
- DONE: Guest sees only public traditions
- Guest may not change any metadata (ideally the edit button wouldn't be there, but that isn't in this code)
related to other roles:
- User sees only public and their own traditions
- Admin sees all traditions
- User may change metadata on their own tradition
- User may not change metadata on traditions they don't own (ideally the edit button wouldn't be there...)
- Admin may change metadata on any tradition
 */

import test_traditions from '../../fixtures/test_traditions.json';

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

// Guests' rights are restricted to ...

// ToDo: close github issues  #170, #157, #155 when tests are passing for all roles.
// Test for Feat/157 user auth (PR #235), related to 'guest':
describe('Guest sees only public traditions (listed in the toc)', () => {
    it('passes', () => {
        // the number of displayed traditions is equal to the number of public traditions
        const count = test_traditions.filter(({access}) => access === 'Public').length;
        cy.log("count: " + count);
        cy.get('ul#traditions-list').children().should('have.length', count);

        test_traditions.forEach((tradition) => {
            if (tradition.access == "Public") {
                // It should be the public traditions' titles which are displayed
                cy.log("title: " + tradition.title);
                cy.get('#traditions-list').contains(tradition.title).should('be.visible');
            }
            else if (tradition.access == "Private") {
                cy.get('#traditions-list').contains(tradition.title).should('not.exist');
            }
            else {
                throw new Error("The tradition is neither 'Private' nore 'Public'!")
            }
        });
    });
});

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should not be able to upload a tradition: not see the feather-plus-circle (next to the toc header "Text directory")', () => {
    it.skip('issue #170, #157', () => {
        cy.contains('h6', 'Text directory').find('svg').should('not.be.visible'); // currently, fails as expected.
    });
});

/* // upload with cy.intercept() ?
describe('A guest should not be able to upload a tradition: in another way than by the feather-plus-circle (next to the toc header "TEXT DIRECTORY", e.g. by interception)', () => {
    it.skip('to do', () => {
    });
}); */

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should not be able to delete any tradition: not be offered the "Delete" button', () => {
    it.skip('issue #170, #157', () => {
        const label = 'Delete';
        cy.contains(label).should('not.be.visible'); // not even before listing the traditions in the toc
        test_traditions.forEach((tradition) => {
            if (tradition.access == "Public") {
                cy.get('#traditions-list').contains(tradition.title).click();
                cy.contains(label).should('not.be.visible');
            }
        cy.contains(label).should('not.be.visible'); // nor after listing the traditions in the toc
        });
    });
});

/* // delete with cy.intercept() ?
describe('A guest should not be able to delete a tradition: in another way than with a "Delete" button, e.g. for "Notre besoin"', () => {
    it.skip('to do', () => {
        cy.contains('Delete').should('not.be.visible');
    });
}); */

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should not be offered to "Edit Collation" of any tradition', () => {
    const label = 'Edit Collation';
    it.skip('issue #170, #157', () => {
        cy.contains(label).should('not.be.visible'); // not even before listing the traditions in the toc
        test_traditions.forEach((tradition) => {
            if (tradition.access == "Public") {
                cy.get('#traditions-list').contains(tradition.title).click();
                cy.contains(label).should('not.be.visible');
            }
        cy.contains(label).should('not.be.visible'); // nor after listing the traditions in the toc
        });
    });
});

// Guest may not change any metadata (ideally the edit button wouldn't be there, but that isn't in this code)
// ToDo: close github issues  #170 and #157 when tests are passing for all roles.
describe('Guest may not change any metadata', () => {
    /* At the moment: edit-properties-button is visible,
    in human interface, it is clickable and 
    when trying to save changes, it is prevented, giving the message: "Error: You need to be logged in to edit a tradition".
    But in cypress, even in headed mode, clicking on the button or its descendents leads to
    "(uncaught exception)TypeError: Cannot read properties of null (reading 'id')"
    if catching the exception, the click does not result in opening the edit panel, so the behaviour cannot be tested.
    The edit button should not be visible anyways, so this test is skipped until the edit button is disabled.
    Then it only needs to be tested that the edit buttun is invisible or disabled. */
    it.skip('under construction', () => {
        // cy.get('property-table-view').find('edit-properties-button').find('svg').should('not.be.visible')

        // As long as the edit button is visible and not disabled, guest should still not be able to change the tradition's properties.
        cy.get('property-table-view').find('h6').find('svg').should('be.visible').as('btn') //.click()
        // cy.once('uncaught:exception', (err) => {
        //     if (err.message.includes('Cannot read properties of null')) {
        //         return false
        //     }
        // })
        cy.get('@btn').click()
    });
});


// A guest should be able to ...

describe('A guest should be offered to download a public "Tradition"', () => {
    it('passes', () => {
        const label = 'Tradition';
        // Private traditions should not be visible for a guest: is verified in another test
        test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
            cy.log('title: ' + tradition.title);
            // click through all traditions
            cy.get('#traditions-list').contains(tradition.title).click();
            cy. get('#stemma-buttons').contains(label).should('be.visible').and('be.enabled');
            // TODO test functionality
        });
    });
});

// A guest should be offered for each stemma of a public tradition,
// and only when a stemma is available, to:
// select stemma, see preview
// see the respective Stemma identifier(, see its correct Witnesses ?),
// 'Examine Stemma' and 'Download Stemma' in all available formats.
// TODO, issue: disable or hide certain elements when no stemma available, etc. see below
describe('A guest should be offered to "Examine Stemma" of a public tradition only for any of its stemmata', () => {
    it.skip('under construction', () => {
        const label_examine = 'Examine Stemma';
        const label_download_stemma = 'Stemma';
        // Private traditions should not be visible for a guest: is verified in another test
        test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
            // click through all public traditions
            cy.log('title: ' + tradition.title);
            // cy.wait(1000);
            cy.get('#traditions-list').contains(tradition.title).click();

            // click through each of its stemmata // select stemma
            if (Array.isArray(tradition.stemmata) && tradition.stemmata.length) {
                // TODO (issue?), check if it makes a problem: re-clicking (manually) on a selector_circle which is active 
                // hides the respective stemma svg on all immediate further clicks. Strangely, passes the test.

                cy.get('#stemma_selector').children().each(($stemmaselector, idx) => {
                    $stemmaselector.find('svg').click(); // circle shaped selectors at the bottom of the page
                    cy.log('idx, tradition.stemmata[idx]: ' + idx + ', ' + tradition.stemmata[idx]);
                    cy.wait(3000); // stemma svg fades in
                    // see preview
                    cy.get('#graph').find('svg').should('be.visible');
                    // see the respective Stemma identifier
                    cy.get('#tradition_info').contains('tr', 'Stemma').as('stemma_row').should('be.visible');
                    // TODO: check it is the correct stemma identifier
                    // cy.get('@stemma_row').contains(tradition.stemmata[idx]); // TODO: Problem with stemma id 'RHM 1641561271_0', is never asserted (Matthew 401). Others are ok.

                    // TODO?: assert the stemma's correct Witnesses

                    // 'Examine Stemma'
                    cy.get('#stemma-buttons').contains(label_examine).should('be.visible').and('be.enabled');
                    // 'Download Stemma' in all available formats.
                    cy.get('#stemma-buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma).as('download_stemma_button').should('be.visible').and('be.enabled');
                    cy.get('@download_stemma_button').click();
                    // cy.get('@download_stemma_button').parent().find('a').should('have.length', 3); // TODO: which formats are availabel?
                    // TODO: test functionality
                });
            } else { // if no stemma is available:
                // no preview selector
                cy.get('#stemma_selector').find('svg').should('not.exist');
                // no preview
                cy.get('#graph').find('svg').should('not.exist');
                // no 'Stemma' identifier in the properties table
                cy.get('#tradition_info').contains('Stemma').should('not.exist');

                // no 'Examine Stemma' offered
                // cy.get('#stemma-buttons').contains(label_examine); // TODO remove line, write issue
                cy.get('#stemma-buttons').contains('TODO: ' + label_examine).should('not.exist'); // TODO eventually: remove and use next line instead
                // cy.get('#stemma-buttons').contains(label_examine).should('not.be.enabled'); // or .should('not.exist')

                // no 'Download Stemma' offered
                // cy.get('#stemma-buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma); // TODO remove line, write issue
                cy.get('#stemma-buttons').find('#stemma_image_downloadbtn').contains('TODO: ' + label_download_stemma).should('not.exist'); // TODO eventually: remove and use next line instead
                // cy.get('#stemma-buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma).should('not.be.enabled'); // or .should('not.exist')
            }
        });
    });
});


// A guest should see ...

describe('A guest should see the heading "Stemmaweb — a collection of tools for the analysis of collated texts"', () => {
    it('passes', () => {
        cy.get('header').contains('a', 'Stemmaweb — a collection of tools for the analysis of collated texts').should('be.visible');
    });
});

describe('A guest should be offered to "Sign in" (the actual sign-in behaviour is examined in another test)', () => {
    it('passes', () => {
        cy.get('header').contains('a', 'Sign in').should('be.visible');
    });
});

describe('A guest should be offered to navigate to the "About" page', () => {
    it('passes', () => {
        cy.get('header').find('a').contains('About');
        // TODO: check the right address is linked and visited
    });
});
