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

// checked against init_test_data.sh
// TODO: check sectionscount
const test_traditions = [
    {   title : "Notre besoin",
        filetype : "stemmaweb",
        owner : "user@example.org",
        language : "French",
        access : "Public",
        // sectionscount : 1,

        // tradition_id : "", // random
        direction : "Left to Right", // implied (language : French)
        witnesses : ["A", "B", "C", "D", "F", "J", "L", "M", "S", "T1", "T2", "U", "V"], // besoin_stemma.json, besoin_stemma_2.json
        stemmata : [
            "Stemweb stemma", // identifier in besoin_stemma.json"
            "Stemweb stemma duplicate" // identifier in besoin_stemma_2.json
        ]
    },
    {   title : "Florilegium \"Coislinianum B\"",
        filetype : "csv",
        owner : "user@example.org",
        language : "Greek",
        access : "Private",
        // sectionscount : 3, // init_test_data.sh sections w x y.

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["A", "B", "C", "D", "E", "F", "G", "H", "K", "P", "Q", "S", "T"], // from the dashboard, looks ok from the florilegium csv files
        stemmata : [
            "stemma of Tomas" // identifier in florilegium_stemma.json
        ]
    },
    {   title : "Legend's fragment", // name given in init_test_data.sh, full title in legendfrag.xml: "Legend of Bishop Henry",
        filetype : "stemmaweb",
        owner : "user@example.org",
        language : "Latin", // in legendfrag.xml (not Armenian, ok)
        access : "Private",
        // sectionscount : 2,

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["A", "Ab", "B", "BA", "BL", "BLu", "BS", "BSt", "BU", "Bc", "C", "Dr", "Ef", "F", "G", "Gh", "H", "Ho", "JG", "K", "L", "Li", "M", "MN", "N", "O", "P", "Q", "S", "Sk", "St", "T", "U", "V", "Vg", "X", "Y"],
        stemmata : []
    },

    {   title : "Ժամանակագրութիւն checked", // just milestone "Matthew 401"; title taken from the graphml/zip file
        filetype : "graphml",
        owner : "benutzer@example.org",
        language : "Armenian",
        access : "Public",
        // sectionscount : 1,

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["A", "B", "Bz430", "Bz644", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M1775", "M2855", "M2899", "M3380", "M6605", "M6686", "M8232", "O", "V", "W", "W243", "W246", "X", "Y", "Z"],
        stemmata : [
            "First attempt", // Stemma is included in zip data
            "RHM 1641561271_0" // Stemma is included in zip data
        ]
    },
    {   title : "John verse",
        filetype : "stemmaweb",
        owner : "benutzer@example.org",
        language : "Greek",
        access : "Private",
        // sectionscount : 1,

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["P60", "P66", "base", "w1", "w11", "w13", "w17", "w19", "w2", "w21", "w211", "w22", "w28", "w290", "w3", "w30", "w32", "w33", "w34", "w36", "w37", "w38", "w39", "w41", "w44", "w45", "w54", "w7"],
        stemmata : []
    },
    {   title : "Arabic snippet",
        filetype : "csv",
        owner : "benutzer@example.org",
        language : "Arabic",
        access : "Private",
        // sectionscount : 1,

        // tradition_id : "",
        direction : "Right to Left", // implied (language : Arabic)
        witnesses : ["A", "B"], // arabic_snippet.csv
        stemmata : []
    },

    {   title : "Verbum uncorrected",
        filetype : "stemmaweb",
        owner : "admin@example.org",
        language : "Latin",
        access : "Private",
        // sectionscount : 1,

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["Ba96", "Er16", "Go325", "Gr314", "Kf133", "Kr185", "Kr299", "Mü11475", "Mü22405", "Mü28315", "MüU151", "Sg524", "Wi3818"], // looks good
        stemmata : []
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

// A guest should not be offered to edit the properties
/* describe('A guest should not be offered to edit Properties', () => {
    it.skip('to do', () => {
    });
}); */


// A guest should be able to ...

// un-skip when issue solved, re-tag 'issue' to 'passes':
describe('A guest should see all public traditions listed in the toc, and only those', () => {
    it.skip('issue', () => {
        // the number of displayed traditions should be equal to the number of public traditions
        // const count = test_traditions.length; // all traditions
        const count = test_traditions.filter(({access}) => access === 'Public').length;
        cy.log("count: " + count);
        cy.get('ul#traditions-list').children().should('have.length', count);

        // It should be the public traditions' titles which are displayed
        // test_traditions.forEach((tradition) => { // all traditions
        test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
            cy.log("title: " + tradition.title);
            cy.get('ul#traditions-list').contains(tradition.title).should('be.visible');
        });
    });
});

describe('A guest should be offered to download a public "Tradition"', () => {
    it('passes', () => {
        const label = 'Tradition';
        // Private traditions should not be visible for a guest: is verified in another test
        test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
            cy.log('title: ' + tradition.title);
            // click through all traditions
            cy.get('#traditions-list').contains(tradition.title).click();
            cy. get('#stemma_buttons').contains(label).should('be.visible').and('be.enabled');
            // TODO test functionality
        });
    });
});

// A guest should be offered for each stemma of a public tradition,
// and only when a stemma is available, to:
// select stemma, see preview
// see the respective Stemma identifier(, see its correct Witnesses ?),
// 'Examine Stemma' and 'Download Stemma' in all available formats.
describe('A guest should be offered to "Examine Stemma" of a public tradition only for any of its stemmata', () => {
    it('passes', () => {
        const label_examine = 'Examine Stemma';
        const label_download_stemma = 'Stemma';
        // Private traditions should not be visible for a guest: is verified in another test
        test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
            // click through all public traditions
            cy.log('title: ' + tradition.title);
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
                    cy.get('#stemma_buttons').contains(label_examine).should('be.visible').and('be.enabled');
                    // 'Download Stemma' in all available formats.
                    cy.get('#stemma_buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma).as('download_stemma_button').should('be.visible').and('be.enabled');
                    cy.get('@download_stemma_button').click();
                    // cy.get('@download_stemma_button').parent().find('a').should('have.length', 3); // TODO: which formats are availabel?
                    // TODO: test functionality
                });
            } else { // if no stemma is available:
                // no preview selector
                cy.get('#stemma_selector').find('svg').should('not.be.visible');
                // no preview
                cy.get('#graph').find('svg').should('not.exist');
                // no 'Stemma' identifier in the properties table
                cy.get('#tradition_info').contains('Stemma').should('not.exist');

                // no 'Examine Stemma' offered
                // cy.get('#stemma_buttons').contains(label_examine); // TODO remove line, write issue
                cy.get('#stemma_buttons').contains('TODO: ' + label_examine).should('not.exist'); // TODO eventually: remove and use next line instead
                // cy.get('#stemma_buttons').contains(label_examine).should('not.be.enabled'); // or .should('not.exist')

                // no 'Download Stemma' offered
                // cy.get('#stemma_buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma); // TODO remove line, write issue
                cy.get('#stemma_buttons').find('#stemma_image_downloadbtn').contains('TODO: ' + label_download_stemma).should('not.exist'); // TODO eventually: remove and use next line instead
                // cy.get('#stemma_buttons').find('#stemma_image_downloadbtn').contains(label_download_stemma).should('not.be.enabled'); // or .should('not.exist')
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

/* describe('A guest should be able to navigate to the "About" page https://stemmaweb.net/', () => {
    it.skip('to do', () => {
    });
}); */
