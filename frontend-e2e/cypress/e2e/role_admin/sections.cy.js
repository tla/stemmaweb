/*  Sections handling should work without side effects

(1)
https://github.com/tla/stemmaweb/pull/162#issue-1618601168:
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

!! after editing a section name, the names in the section box and in the tradition list should be equal.

(2)
https://github.com/tla/stemmaweb/pull/128#issuecomment-1433344593:
reordering of sections. Functionalities to be tested:

    User can reorder sections by dragging, subtests:
        Reorder fails on server side: alert is displayed, dragged section is returned to original position
        User 'drops' drag by accident (e.g. outisde droppable list): section is returned to original position
        Selected list item is highighted when dragged
        Selected list item is unhighlighted when dropped
        Selected list item can only be dropped on parent list (dropping elsewhere has no effects/consequences)

*/

import test_traditions from '../../fixtures/test_traditions.json';
import users from '../../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.viewport(1600, 900);
    test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
    cy.loginViaUi(admin);
});

afterEach(() => {
    cy.logoutViaUi();
});

// count sections of each (public) tradition is correct
describe('Each tradition should have the right number of sections listed in the toc', () => {
    it.skip('under construction', () => { // to do: db initial state.
        // TODO: number of sections currently varies in course of other test(s)
        // TODO: switch the lines (to filter 'Public' traditions) when user rights are implemented:
        // test_traditions.filter(({access}) => access === 'Public').forEach((tradition) => {
        test_traditions.forEach((tradition) => {
            // choose the tradition in the toc that has the right title
            // click on the .folder-icon in front of it
            // assert that the number of sections visible in the toc correponds to that in the list of traditions

            // TODO: add issue to scroll tradition-list, otherwise it is 
            // not possible to access tradition titles and sections at the
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
    it('passes in local headed mode', () => { // under construction: relative path to sections file in headless mode
        // reseed db
        cy.reseedDB();

        // input string for the test section to be added
        const new_section_name = 'NEW SECTION BY CY';


        // relative path starting from frontend-e2e folder in local headed mode
        const new_section_rel_path = './../bin/init-data/stemmarest/data/florilegium_z.csv';
        // TODO: check if there is a standard cy way to refer to relative paths

        // test with one tradition which has a few sections
        // add and delete a section so that the final sections and their orders equal the initial ones
        // edit and move sections also with no side effects
        // assert that info in tradition list always equals to that in the sections panel
        test_traditions.filter(({title}) => title === 'Florilegium "Coislinianum B"').forEach((tradition) => {
            cy.log('tradition.title: ' + tradition.title); // Florilegium "Coislinianum B"

            // click on the tradition and unfold the sections
            cy.get('ul#traditions-list').contains('.nav-item', tradition.title).as('navitem');
            cy.get('@navitem').find('.folder-icon').wait(500).click();
            cy.get('@navitem').find('section-list').find('ul').children().as('sections');

/* TO DO: set db to initial content after adding sections, otherwise number will not match.
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
                expect(tradition.sections[index].name).to.eq($ele.text().trim());
            });
 */
            // Add section
            /* Click on the plus-feather next to "Text Directory",
            click on "Add a section to an existing tradition" within the modal that appears,
            enter name: new_section_name,
            add file: new_section_rel_path,
            select data format: comma-separated values (spreadsheet collation),
            choose tradition to which the section should be added at the end: Florilegium "Coislinianum B"
            click on: Save changes. */
            cy.contains('#sidebar-menu', 'Text directory').find('svg.feather-plus-circle').click();
            cy.get('.modal-content').find('#button_new_section').click();
            cy.get('#add_tradition_modal').as('add_tradition_or_section').should('be.visible');
            cy.get('@add_tradition_or_section').find('input#new_name').click().wait(500).type(new_section_name, { delay: 50 });
            cy.get('@add_tradition_or_section').find('input#uploadfile').selectFile(new_section_rel_path);
            cy.get('@add_tradition_or_section').find('select#new_filetype').select('Comma-separated values (spreadsheet collation)').should('have.value', 'csv');
            cy.get('@add_tradition_or_section').find('select#upload_for_tradition').select('Florilegium "Coislinianum B"');

            cy.contains('button', 'Save changes').click();

            // Delete section
            // TODO: put in a function for re-use
            cy.reload(true); // necessary just in cypress
            // click on the tradition and unfold the sections
            cy.get('ul#traditions-list').contains('.nav-item', tradition.title).as('navitem');
            // Click on the folder icon of the relevant tradition to unfold the sections,
            cy.get('@navitem').find('.folder-icon').click();
            cy.get('@navitem').find('section-list').find('ul').children().as('sections');
            cy.wait(500);
            // click on the relevant section name,
            cy.get('@sections').find('.section-name').contains(new_section_name).click();
            
            // in the property panel assert that the relevant section name is displayed,
            cy.get('#section-info').contains('tr', 'Name').as('section_name_row');
            cy.get('@section_name_row').contains(new_section_name);

            // click on the trash bin icon next to it,
            cy.get('delete-section-button').click();
            cy.get('button').contains('Yes, delete it').click();
            cy.wait(500);
            cy.reload(true); // the delete modal does close usually but not in cypress

            // assert that the new_section_name is no longer displayed in the tradition list,
            // assert the correct number of sections: Restore original section list.

            // click on the tradition and unfold the sections
            cy.get('ul#traditions-list').contains('.nav-item', tradition.title).as('navitem');
            cy.get('@navitem').find('.folder-icon').click();
            cy.get('@navitem').find('section-list').find('ul').children().as('sections');

/* TO DO: set db to initial content after adding sections, otherwise number will not match.
            // ensure count sections on website equals count sections of testtradition in test_traditions list (3)
            cy.get('@sections').then((sections) => {
                expect(sections.length).to.eq(tradition.sections.length);
            });
            // ensure the order of the sections equals to that in the traditions_list
            cy.get('@sections').each(($ele, index) => {
                expect($ele.text().trim()).to.eq(tradition.sections[index].name);
                // new_section_name is never found
                expect($ele.text().trim()).not.contains(new_section_name);
            });
 */
        });
    });
});

describe('User can reorder sections by dragging', () => {
    it.skip('under construction', () => { // to do: set db to initial state
        test_traditions.forEach((tradition) => {
            cy.log("tradition.title", tradition.title)
            tradition.sections.forEach((section) => {
                cy.log("sections.name", section.name);
            })
        })
    });
});
