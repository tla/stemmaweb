/*  A guest (i.e. a visitor who has not signed in yet) should,
as far as the public traditions are concerned,

    - not see any private test tradition listed in the toc,
    - not be able to upload a tradition:
        - not see the feather-plus-circle (next to the toc header 'TEXT DIRECTORY'),
        - ? not be able to add a tradition in another way,
    - not be able to delete any tradition:
        - not see the 'Delete' button,
        - ? not be able to delete a tradition in another way,
    - not be offered to 'Edit Collation'.

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
user@example.org (pw UserPass) has three traditions

    Notre besoin, public
    Florilegium, private (with multiple sections)
    Legend fragment, private (with multiple sections)

benutzer@example.org (pw BenutzerKW) has three traditions

    Matthew 401, public
    John verse, private
    Arabic snippet, private

admin@example.org (pw AdminPass) has one tradition

    Verbum uncorrected, private

 */

const test_traditions = [
    {   title : "Notre besoin",
        tradition_id : "13ffdd57-fbbb-4935-9bcd-387ddfcaa14b",
        owner : "user@example.org",
        access : "Public",
        witnesses : ["A", "B", "C", "D", "F", "J", "L", "M", "S", "T1", "T2", "U", "V"]
    },
    {   title : "Florilegium \"Coislinianum B\"",
        tradition_id : "d87fd1f5-492b-43bf-b1b3-9b17cc188053",
        owner : "user@example.org",
        access : "Private",
        witnesses : ["A", "B", "C", "D", "E", "F", "G", "H", "K", "P", "Q", "S", "T"]
    },
    {   title : "Legend's fragment",
        tradition_id : "2934befb-4c19-4a6e-834a-0e81e030d55b",
        owner : "user@example.org",
        access : "Private",
        witnesses : ["A", "Ab", "B", "BA", "BL", "BLu", "BS", "BSt", "BU", "Bc", "C", "Dr", "Ef", "F", "G", "Gh", "H", "Ho", "JG", "K", "L", "Li", "M", "MN", "N", "O", "P", "Q", "S", "Sk", "St", "T", "U", "V", "Vg", "X", "Y"]
    },

    {   title : "Ժամանակագրութիւն checked", // == Matthew 401 ?
        tradition_id : "4aaf8973-7ac9-402a-8df9-19a2a050e364",
        owner : "benutzer@example.org",
        access : "Public",
        witnesses : ["A", "B", "Bz430", "Bz644", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M1775", "M2855", "M2899", "M3380", "M6605", "M6686", "M8232", "O", "V", "W", "W243", "W246", "X", "Y", "Z"]
    },
    {   title : "John verse",
        tradition_id : "2003399b-d291-4562-bbe9-2945e20c8ef7",
        owner : "benutzer@example.org",
        access : "Private",
        witnesses : ["P60", "P66", "base", "w1", "w11", "w13", "w17", "w19", "w2", "w21", "w211", "w22", "w28", "w290", "w3", "w30", "w32", "w33", "w34", "w36", "w37", "w38", "w39", "w41", "w44", "w45", "w54", "w7"]
    },
    {   title : "Arabic snippet",
        tradition_id : "29547a33-6c3d-47c0-b0a0-70960d2c9ef3",
        owner : "benutzer@example.org",
        access : "Private",
        witnesses : ["A", "B"]
    },

    {   title : "Verbum uncorrected",
        tradition_id : "b64b519f-7d10-4698-80ff-9f241aad0cac",
        owner : "admin@example.org",
        access : "Private",
        witnesses : ["Ba96", "Er16", "Go325", "Gr314", "Kf133", "Kr185", "Kr299", "Mü11475", "Mü22405", "Mü28315", "MüU151", "Sg524", "Wi3818"]
    },
];

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

// A guest should not be able to ...

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should not see any private tradition listed in the toc', () => {
    it.skip('issue', () => {
        test_traditions.forEach((tradition) => {
            if (tradition.access == "Private") {
                cy.get('#traditions-list').contains(tradition.title).should('not.exist');
            }
        });
    });
});

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should not be able to upload a tradition: not see the feather-plus-circle (next to the toc header "Text dirtectory"),', () => {
    it.skip('issue', () => {
        // cy.contains('h6', 'Text dirtectory').find('svg circle'); // is there
        // cy.contains('h6', 'Text dirtectory').find('svg circle').should('exist'); // is there // trying out 'exist'
        // cy.contains('h6', 'Text dirtectory').find('svg circle').should('not.exist'); // it might exist in the dom but should not be visible
        // cy.contains('h6', 'Text dirtectory').find('svg').should('be.visible'); // is visible
        cy.contains('h6', 'Text directory').find('svg').should('not.be.visible'); // currently, fails as expected.
    });
});

/* // upload with cy.intercept() ?
describe('A guest should not be able to upload a tradition: in another way than by the feather-plus-circle (next to the toc header "TEXT DIRECTORY", e.g. by interception)', () => {
    it.skip('to do', () => {
    });
}); */

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should not be able to delete any tradition: not be offered the "Delete" button"', () => {
    it.skip('issue', () => {
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
    it.skip('issue', () => {
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


// A guest should be able to ...

/* describe('A guest should see all public traditions listed in the toc and be able to see their svg graphs', () => {
    it.skip('to do', () => {
    });
});

describe('A guest should be able to download a public "Tradition"', () => {
    it.skip('to do', () => {
    });
}); 

describe('A guest should be able to download "Stemma", e.g. of "Notre besoin"', () => {
    it.skip('to do', () => {
        cy.get('#traditions_list')
            .contains(/^Notre besoin$/)
            .click();
        cy.get('#tradition_name').contains(/^Notre besoin$/);
        cy.contains('Stemma').click();
        cy.get('a#download_svg');
        // check file downloaded: https://stackoverflow.com/questions/66478056/cypress-how-to-verify-if-a-file-is-downloaded 
        cy.get('a#download_png');
        cy.get('a#download_dot');
    });
});

describe('A guest should be able to "Examine Stemma", e.g. of "Notre besoin"', () => {
    it.skip('to do', () => {
    });
}); */


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

/* describe('A guest should be able to navigate to the "About" page https://stemmaweb.net/', () => {
    it.skip('to do', () => {
    });
}); */
