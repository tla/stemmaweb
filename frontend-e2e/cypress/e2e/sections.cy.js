/*  Sections handling should work without side effects

https://github.com/tla/stemmaweb/pull/162: 
This one implements issue #10 (https://github.com/tla/stemmaweb/issues/10), deleting of sections.
Tests to be added:
* add a section
* then delete it
* then delete a pre-existing section
* rerun all other tests (there should be no side effects)
* esp. order of sections shouldn't be affected
* ordering should still function
* editing sections should be unaffected
* etc.

* after editing a section name, the names in the section box and in the tradition list should be equal.

*/

// Use same test_traditions array as in guests_provileges.cy.js
// TODO: utilities directory with variables to be used across files, or other solution
const test_traditions = [
    {   title : "Notre besoin",
        filetype : "stemmaweb",
        owner : "user@example.org",
        language : "French",
        access : "Public",
        sectionscount : 1,
        sections : [
            {   name: 'DEFAULT',
                language : 'French'
            },
        ],

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
        sectionscount : 3, // init_test_data.sh sections w x y.
        sections : [
            {   name: 'section \'w\'',
                language : 'Greek'
            },
            {   name: 'section \'x\'',
                language : 'Greek'
            },
            {   name: 'section \'y\'',
                language : 'Greek'
            },
        ],

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
        sectionscount : 2,
        sections : [
            {   name: 'DEFAULT',
                language : 'Latin'
            },
            {   name: 'section 2',
                language : 'Latin'
            },
        ],

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["A", "Ab", "B", "BA", "BL", "BLu", "BS", "BSt", "BU", "Bc", "C", "Dr", "Ef", "F", "G", "Gh", "H", "Ho", "JG", "K", "L", "Li", "M", "MN", "N", "O", "P", "Q", "S", "Sk", "St", "T", "U", "V", "Vg", "X", "Y"],
        stemmata : []
    },

    {   title : "Ժամանակագրութիւն checked", // just milestone "Matthew 401"; title taken from the graphml/zip file
        filetype : "graphml",
        owner : "benutzer@example.org",
        language : "Armenian",
        access : "Private",
        sectionscount : 1,
        sections : [
            {   name: 'milestone-401',
                language : 'Armenian'
            },
        ],

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
        access : "Public",
        sectionscount : 1,
        sections : [
            {   name: 'DEFAULT',
                language : 'Greek'
            },
        ],

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
        sectionscount : 1,
        sections : [
            {   name: 'DEFAULT',
                language : 'Arabic'
            },
        ],

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
        sectionscount : 1,
        sections : [
            {   name: 'DEFAULT',
                language : 'Latin'
            },
        ],

        // tradition_id : "",
        direction : "Left to Right",
        witnesses : ["Ba96", "Er16", "Go325", "Gr314", "Kf133", "Kr185", "Kr299", "Mü11475", "Mü22405", "Mü28315", "MüU151", "Sg524", "Wi3818"], // looks good
        stemmata : []
    },
];

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);

/*     // Notre besoin and Legend's fragment belong to user@example.org
    cy.contains('Sign in').click();
    cy.wait(500);
    cy.get('#loginEmail').type('user@example.org', { delay: 50 });
    cy.wait(500);
    cy.get('#loginPassword').type('UserPass', { delay: 50 });
    cy.wait(500);
    cy.contains('button', 'Sign in').click();
    cy.contains('Logged in as user@example.org'); */
});

// count sections of each (public) tradition is correct
describe('Each tradition should have the right number of sections listed in the toc', () => {
    it.skip('passes', () => {
        // TODO: switch the lines (to filter 'Public' traditions) when user rights are implemented:
        // test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
        test_traditions.forEach((tradition) => {
            // choose the tradition in the toc that has the right title
            // click on the .folder-icon in front of it
            // assert that the number of sections visible in the toc correponds to that in the list of traditions

            // TODO: add issue to scroll tradition-list, otherwise it is 
            // not possible to access tratition titles and sections at the 
            // bottom of the list. Preliminary solution here: lengthen viewport.
            cy.viewport(1000, 990);

            cy.log("title: " + tradition.title);
            cy.get('ul#traditions-list').contains('.nav-item', tradition.title).as('navitem');
            cy.get('@navitem').find('.folder-icon').click();
            cy.get('@navitem').find('section-list').find('ul').children().should('have.length', tradition.sectionscount);
        });
    });
});

describe('Section handling works correcly in the tradition list and the section properties area', () => {
    it('passes', () => {

        // needed input
        const new_section_rel_path = './../bin/init-data/stemmarest/data/florilegium_z.csv';
        const new_section_name = 'NEW SECTION';

        // test with one tradition which has a few sections
        // add and delete a section so that the final sections and their orders equal the initial ones
        // edit and move sections also with no side effects
        // assert that info in tradition list always equals to that in the sections panel
        test_traditions.filter(({title}) => title === 'Florilegium "Coislinianum B"').forEach((tradition) => {
            cy.log('tradition.title : ' + tradition.title); // Florilegium "Coislinianum B"

            // login
            cy.contains('Sign in').click();
            cy.get('#loginEmail').should('be.visible').type('user@example.org', { delay: 50 });
            cy.wait(500);
            cy.get('#loginPassword').type('UserPass', { delay: 50 });
            cy.contains('button', 'Sign in').click();
            cy.contains('Logged in as user@example.org');

            // click on the tradition and unfold the sections
            cy.get('ul#traditions-list').contains('.nav-item', tradition.title).as('navitem');
            cy.get('@navitem').find('.folder-icon').click();
            cy.get('@navitem').find('section-list').find('ul').children().as('sections');

            // ensure count sections on website equals count sections of testtradition in test_traditions list (3)
            // cy.log('@sections.length: ' + '@sections'.length); // 9 ???
            cy.get('@sections').then((sections) => {
                // cy.log('sections.length: ' + sections.length); // 3
                // cy.log('tradition.sections.length: ' + tradition.sections.length); // 3
                expect(sections.length).to.eq(tradition.sections.length);
            });

            // The 3 sections should be: w, x, y
            // ensure the order of the sections equals to that in the traditions_list
            cy.get('@sections').each(($ele, index) => {
                // cy.log('Name of section ' + index + ": " + $ele.text());
                // cy.log('tradition.sections[index].name: ' + tradition.sections[index].name);
                expect(tradition.sections[index].name).to.eq('' + $ele.text().trim());
            });

            // logout
            cy.contains('Sign out').click();
            cy.contains('Sign in').should('be.visible');
        });
    });
});
