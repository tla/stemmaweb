/*  gui element to run stemweb
https://github.com/tla/stemmaweb/pull/172#issue-1680053781

refactor: small tweaks to button colors
refactor: replace space in ids for inputs in dropdowns with '-' (todo issued as #171)
feature: alphabetic compare function in utils.js
refactor: changed adding of eventlisteners in stemmaButtons.js

Tests to add:

    click on button "Run Stemweb" should open Stemweb dialog
    Dropdown should show names of Stemweb algorithms (currently: RHM, Neighbour joining, and Neighbour net)
    Click info badge ('i') should show description of algorithm
    Click on RHM should reveal argument field 'Iterations'
    Click on other algorithms should not show any argument fields
    Click on Cancel or anywhere outside dialog closes dialog
    Click on "Run" shows a success message 'Job added' and closes dialog

*/

import stemweb_algorithms from '../fixtures/stemweb_algorithms.json'
const len_stemweb_algorithms = stemweb_algorithms.length;

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

describe('Stemweb dialog should work properly', () => {
    it('passes', () => {
        cy.viewport(1600, 900);

        // click on button "Run Stemweb" should open Stemweb dialog
        cy.contains('Run Stemweb').click();
        cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
        cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');

        // Dropdown should show names of Stemweb algorithms
        // (currently: RHM, Neighbour Joining, and Neighbour Net, and Pars)
        cy.get('@stemwebmodal').find('select>option')
        .should('have.length', len_stemweb_algorithms) // number of options is ok
        .each(($el, index, $list) => {
            const optionText = $el.text().trim();
            cy.get('@stemwebmodal').find('select').select(optionText); // click on optionText
            cy.get('@stemwebmodal').find('select option:selected') // get the selected option
                .invoke("text").then((txt) => {
                    const selected = txt.trim();
                    expect(selected).equal(optionText); // ok, desired option is selected
                    expect(optionText).equal(stemweb_algorithms[index].text); // and it matches the test data

                    // Click info badge ('i') should show description of algorithm
                    cy.get('@stemwebmodal').find('form').find('svg') // .its('length').then((len) => {cy.log(len)});
                    .should('have.length', 1)
                    .click();
                    cy.get('@stemwebmodal').find('#algorithm-info')
                    .invoke('html').then((innerHTML) => {
                        expect(innerHTML).equal(stemweb_algorithms[index].description);
                    });

                    // Click on RHM should reveal argument field 'Iterations'
                    if (optionText === 'RHM') {
                        cy.get('@stemwebmodal').find('#algorithm-args').find('#iterations_input').should('be.visible');
                    // Click on other algorithms should not show any argument fields
                    } else {
                        cy.get('@stemwebmodal').find('#algorithm-args').children().should('not.exist');
                    }
                });
        });

        // Click on Cancel closes dialog
        cy.get('@stemwebmodal').should('be.visible');
        cy.get('@stemwebmodal').find('button').contains('Cancel').trigger('mouseover').click();
        cy.get('@stemwebmodal').should('not.be.visible');

        // Click on anywhere outside dialog closes dialog
        cy.contains('Run Stemweb').click();
        cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
        cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');
        cy.get('@stemwebmodal').closest("#modalDialog").then((elem) => {
            cy.log("#modalDialog:", elem);
        });
        cy.get('@stemwebmodal').closest("#modalDialog").as('mdialog');
        // cy.get('@mdialog').its('length').then((len) => {cy.log('length:' + len)});
        cy.get('@mdialog').find('form').trigger('mouseover', { 'timeout': 10000 }).click(); // first click inside, then outside of the modal in order to close it in cypress
        cy.get('@mdialog').trigger('mouseover', { 'timeout': 10000 }).click('left');
        cy.get('@stemwebmodal').should('not.be.visible');

        // for any algorithm open the modal again to assert 'Job added' and dialog closed
        for(const algorithm of stemweb_algorithms) {
            cy.reload();
            cy.log("algorithm.text", algorithm.text)
            cy.contains('Run Stemweb').wait(500).click();
            cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
            cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');

            cy.get('@stemwebmodal').find('select>option')
                .each(($el, index, $list) => {
                    const optionText = $el.text().trim();
                    cy.log('optionText', optionText)
                    if (algorithm.text === optionText){
                        cy.get('@stemwebmodal').find('select').select(optionText); // click on optionText
                        if (optionText === 'Pars') {
                            // TODO: Issue #187 with Pars algorithm, not "Job added" but "Error: INTERNAL SERVER ERROR"
                        } else {
                            // Click on "Run" shows a success message 'Job added'
                            // and closes dialog
                            cy.get('@stemwebmodal').find('button').contains('Run').wait(500).trigger('mouseover').click(); // wait() for the event listener to close the modal to be attached (https://www.cypress.io/blog/2019/01/22/when-can-the-test-click)
                            cy.get('stemmaweb-alert').contains('Job added');
                            cy.get('@stemwebmodal').should('not.be.visible');
                        }
                    }
                });
        }
    });
});
