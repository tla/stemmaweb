/*  Changing Tradition metadata should be fully functional
https://github.com/tla/stemmaweb/pull/128#issuecomment-1428087233

Cypress tests to be added:

    Update/change of
        name,
        access,
        language,
        and direction
        using the edit button (top right hand side) should be reflected in the properties shown in the table.
    If the name changes, that should also be visible in the main page (top of page has the name/title of the Tradition).

Note that this PR also starts implementing displaying sections and display/change of section metadata, but this is not test ready yet.

Update 2023-02-14: section metadata is now showing correctly, and can be tested, no editing sections yet.

Cypress tests to be added:

    Clicking a tradition should expand a list of sections
    Clicking section should show section in properties pane (right hand side)
    Clicking a section of another tradition should update screen to that tradition, its related primary stemma, properties, and the properties of the section
    Clicking a tradition should remove section properties from another tradition in the section properties pane on the right hand side of the screen

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
});

// count sections of each (public) tradition is correct
describe('Changing Tradition metadata should be fully functional', () => {
    it.skip('under construction', () => { // set db to initial state
        // test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
        test_traditions.forEach((tradition) => {
            // ... 
        });
    });
});
