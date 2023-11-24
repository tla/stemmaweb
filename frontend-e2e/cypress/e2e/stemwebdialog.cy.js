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
    Click on "Run" (not implemented yet, just closes dialog for now)

*/

import stemweb_algorithms from '../fixtures/stemweb_algorithms.json'
const len_stemweb_algorithms = stemweb_algorithms.length;

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

describe('Stemweb dialog should work properly', () => {
    it('under construction', () => {
        // click on button "Run Stemweb" should open Stemweb dialog
        cy.contains('Run Stemweb').click();
        cy.get('stemmaweb-dialog').as('stemwebmodal');
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
                        cy.get('@stemwebmodal').find('#iterations_input').should('be.visible');
                    // Click on other algorithms should not show any argument fields
                    } else {
                        cy.get('@stemwebmodal').find('#iterations_input').should('not.exist');
                    }
                });
        });

        // Click on Cancel closes dialog
        cy.get('@stemwebmodal').should('be.visible');
        cy.get('@stemwebmodal').find('button').contains('Cancel').trigger('mouseover').click();
        cy.get('@stemwebmodal').should('not.be.visible');

        // Click on "Run" (not implemented yet, just closes dialog for now)
        cy.contains('Run Stemweb').click();
        cy.get('stemmaweb-dialog').as('stemwebmodal');
        cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');
        cy.get('@stemwebmodal').find('button').contains('Run').trigger('mouseover').click();
        cy.get('@stemwebmodal').should('not.be.visible'); // <div.modal-content> still existing

        // Click on anywhere outside dialog closes dialog
    });
});
