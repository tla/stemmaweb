/*  gui element to run stemweb
https://github.com/tla/stemmaweb/pull/172#issue-1680053781

1)
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

2)
Run a StemWeb algorithm and fetch results (backend) #103
https://github.com/tla/stemmaweb/pull/185#issue-2050160053
Cypress tests that could be added:
    Florilegium shows a status of:
        Job: 2
        Status: Running
    Arabic snippet shows a status of:
        Job: 3
        Status: Error
        Result: Pretend we had an error here.
    Notre Besoin traditions shows a status of:
        Job: 1
        Status: Done

3)
Tests for feature: implemented stemma editor
https://github.com/tla/stemmaweb/pull/188#issue-2133307487
• Test that svg appears.
• Upon edit, svg and box should be there.
• Upon a change in the left box (a valid dot, link btw x and y), verify that svg is just different.

*/

import test_traditions from '../fixtures/test_traditions.json';
import stemweb_algorithms from '../fixtures/stemweb_algorithms.json'
const len_stemweb_algorithms = stemweb_algorithms.length;

beforeEach(() => {
    // cy.intercept('GET', `**/requests/**`).as('any_req');
    // cy.intercept('GET', `**/requests/**/algorithms/**`).as('algorithms_req');
    cy.intercept('GET', `**/requests/**/stemmata`).as('stemmata_req');
    cy.intercept('GET', `**/requests/**/sections`).as('sections_req');
    cy.intercept('GET', `**/requests/**/jobstatus/**`).as('jobstatus_req');
    cy.intercept('GET', `**/wasm/**`).as('wasm_use');

    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);

    /* cy.wait('@algorithms_req').then(interception => {
        cy.log('interception.request.url: ' + interception.request.url);
        cy.log('interception.response.body: ' + interception.response.body);
        cy.log('interception.response.statusCode: ' + interception.response.statusCode);
    }); */

    cy.viewport(1600, 900);
});

describe('Stemweb dialog should work properly', () => {
    it('passes', () => {
        // click on button "Run Stemweb" should open Stemweb dialog
        cy.contains('Run Stemweb').wait(500).click();
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
                .invoke('text').then((txt) => {
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
        cy.get('@stemwebmodal').find('button').contains('Cancel').wait(500).click();
        cy.get('@stemwebmodal').should('not.be.visible');

        // Click on anywhere outside dialog closes dialog
        cy.contains('Run Stemweb').click();
        cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
        cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');
        cy.get('@stemwebmodal').closest('#modalDialog').then((elem) => {
            cy.log('#modalDialog:' + elem);
        });
        cy.get('@stemwebmodal').closest('#modalDialog').as('mdialog');
        // cy.get('@mdialog').its('length').then((len) => {cy.log('length:' + len)});
        cy.get('@mdialog').wait(500).click('left');
        cy.get('@stemwebmodal').should('not.be.visible');

        // for any algorithm open the modal again to assert 'Job added' and dialog closed
        for(const algorithm of stemweb_algorithms) {
            cy.reload();
            cy.log('algorithm.text: ' + algorithm.text)
            cy.contains('Run Stemweb').wait(500).click();
            cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
            cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');

            cy.get('@stemwebmodal').find('select>option')
                .each(($el) => {
                    const optionText = $el.text().trim();
                    cy.log('optionText:' + optionText)
                    if (algorithm.text === optionText){
                        cy.get('@stemwebmodal').find('select').select(optionText); // click on optionText
                        if (optionText === 'Pars') {
                            // TODO: Issue #187 with Pars algorithm, not "Job added" but "Error: INTERNAL SERVER ERROR"
                        } else {
                            // Click on "Run" shows a success message 'Job added'
                            // and closes dialog
                            cy.get('@stemwebmodal').find('button').contains('Run').wait(500).click(); // wait() for the event listener to close the modal to be attached (https://www.cypress.io/blog/2019/01/22/when-can-the-test-click)
                            cy.get('stemmaweb-alert').contains('Job added');
                            cy.get('@stemwebmodal').should('not.be.visible');
                        }
                    }
                });
        }
    });
});

describe('Runs a StemWeb algorithm and fetches results (backend)', () => {
    // https://github.com/tla/stemmaweb/issues/103
    // https://github.com/tla/stemmaweb/pull/185

    it('passes', () => {
        test_traditions.forEach((tradition) => {
            const traditionTitle = tradition.title;
            cy.log('traditionTitle: ' + traditionTitle);

            // get the toc entry for the tradition which starts with Florilegium and click on it,
            // the same for Arabic snippet and for Notre besoin.
            if (traditionTitle.startsWith("Florilegium")) {
                cy.get('#traditions-list').contains(traditionTitle).click();
                cy.contains('Run Stemweb').click();
                cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
                cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');
                cy.get('@stemwebmodal').find('button').contains('Run').wait(500).click();
                cy.get('stemmaweb-alert').contains('Job added');
                cy.get('@stemwebmodal').should('not.be.visible');
                // Florilegium shows a status of: Job: 2. Status: Running
                // data to be asserted within the stemweb-job-status element
                cy.get('stemweb-job-status').contains('#job_status', '2').and('contain.text', 'Running');
            } else if (traditionTitle.startsWith("Arabic snippet")) {
                cy.get('#traditions-list').contains(traditionTitle).click();
                cy.contains('Run Stemweb').click();
                cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
                cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');
                cy.get('@stemwebmodal').find('button').contains('Run').wait(500).click();
                cy.get('stemmaweb-alert').contains('Job added');
                cy.get('@stemwebmodal').should('not.be.visible');
                // Arabic snippet shows a status of: Job: 3. Status: Error. Result: Pretend we had an error here.
                cy.get('stemweb-job-status').contains('#job_status', '3').and('contain.text', 'Error').and('contain.text', 'Pretend we had an error here.');
            } else if (traditionTitle.startsWith("Notre besoin")) {
                cy.get('#traditions-list').contains(traditionTitle).click();
                cy.contains('Run Stemweb').click();
                cy.get('stemmaweb-dialog .modal-content').as('stemwebmodal');
                cy.get('@stemwebmodal').contains('Generate a Stemweb tree').should('be.visible');
                cy.get('@stemwebmodal').find('button').contains('Run').wait(500).click();
                cy.get('stemmaweb-alert').contains('Job added');
                cy.get('@stemwebmodal').should('not.be.visible');
                // Notre Besoin tradition shows a status of: Job: 1. Status: Done
                cy.get('stemweb-job-status').contains('#job_status', '1').and('contain.text', 'Done');
            // traditions for which Stemweb has not been run should not display the stemweb-job-status
            } else {
                cy.get('#traditions-list').contains(traditionTitle).click();
                cy.get('stemweb-job-status').should('not.be.visible');
            }

            // stemweb-job-status should still be there after coming back from clicking on other traditions
            test_traditions.reverse().forEach((tradition) => {
                const traditionTitle = tradition.title;
                cy.log('traditionTitle: ' + traditionTitle);
                cy.get('#traditions-list').contains(traditionTitle).click();
                if (traditionTitle.startsWith("Florilegium")) {
                    // Notre Besoin tradition shows a status of: Job: 1. Status: Done
                    cy.get('stemweb-job-status').contains('#job_status', '2').and('contain.text', 'Running');
                } else if (traditionTitle.startsWith("Arabic snippet")) {
                    // Arabic snippet shows a status of: Job: 3. Status: Error. Result: Pretend we had an error here.
                    cy.get('stemweb-job-status').contains('#job_status', '3').and('contain.text', 'Error').and('contain.text', 'Pretend we had an error here.');
                } else if (traditionTitle.startsWith("Notre besoin")) {
                    // Notre Besoin tradition shows a status of: Job: 1. Status: Done
                    cy.get('stemweb-job-status').contains('#job_status', '1').and('contain.text', 'Done');
                } else {
                    // traditions for which Stemweb has not been run should not display the stemweb-job-status
                    cy.get('#traditions-list').contains(traditionTitle).click();
                    cy.get('stemweb-job-status').should('not.be.visible');
                }
            });
        });
    });
});

describe('stemma editor tools and svg work properly', () => {
    /* Tests for feature: implemented stemma editor
    https://github.com/tla/stemmaweb/pull/188#issue-2133307487
    • Test that svg appears.
    • Upon edit, svg and box should be there.
    • Upon a change in the left box (a valid dot, link btw x and y), verify that svg is just different.
     */
    it.only('under construction', { defaultCommandTimeout: 60000, requestTimeout: 60000, responseTimeout: 60000 }, () => {
        const tradition = test_traditions.find(trad => trad.title.startsWith('Florilegium'));
        cy.log('tradition.title: ' + tradition.title);
        // click on the tradition title within the tradition list
        cy.get('#traditions-list').contains(tradition.title).click();

        cy.wait(['@stemmata_req', '@sections_req', '@jobstatus_req', '@wasm_use']).then(
            (interceptions) => {
              cy.log('interceptions[0].request.url: ' + interceptions[0].request.url);
              cy.log('interceptions[0].response.body: ' + interceptions[0].response.body);
              cy.log('interceptions[0].response.statusCode: ' + interceptions[0].response.statusCode);

              cy.log('interceptions[1].request.url: ' + interceptions[1].request.url);
              cy.log('interceptions[1].response.body: ' + interceptions[1].response.body);
              cy.log('interceptions[1].response.statusCode: ' + interceptions[1].response.statusCode);

              cy.log('interceptions[2].request.url: ' + interceptions[2].request.url);
              cy.log('interceptions[2].response.body: ' + interceptions[2].response.body);
              cy.log('interceptions[2].response.statusCode: ' + interceptions[2].response.statusCode);

              cy.log('interceptions[3].request.url: ' + interceptions[3].request.url);
              cy.log('interceptions[3].response.body: ' + interceptions[3].response.body);
              cy.log('interceptions[3].response.statusCode: ' + interceptions[3].response.statusCode);

            }
        );
        /* cy.wait('@stemmata_req').then(interception => {
            cy.log('interception.request.url: ' + interception.request.url);
            cy.log('interception.response.body: ' + interception.response.body);
            cy.log('interception.response.statusCode: ' + interception.response.statusCode);
        });
        cy.wait('@sections_req').then(interception => {
            cy.log('interception.request.url: ' + interception.request.url);
            cy.log('interception.response.body: ' + interception.response.body);
            cy.log('interception.response.statusCode: ' + interception.response.statusCode);
        });
        cy.wait('@jobstatus_req').then(interception => {
            cy.log('interception.request.url: ' + interception.request.url);
            cy.log('interception.response.body: ' + interception.response.body);
            cy.log('interception.response.statusCode: ' + interception.response.statusCode);
        });
        cy.wait('@wasm_use').then(interception => {
            cy.log('interception.request.url: ' + interception.request.url);
            cy.log('interception.response.body: ' + interception.response.body);
            cy.log('interception.response.statusCode: ' + interception.response.statusCode);
        }); */
        /* cy.wait('@any_req').then(interception => {
            cy.log('interception.request.url: ' + interception.request.url);
            cy.log('interception.response.body: ' + interception.response.body);
            cy.log('interception.response.statusCode: ' + interception.response.statusCode);
            // expect(interception.response.statusCode).to.eq(200);
        }); */

        // Florilegium has 1 stemma svg at start
        // the same number of selector icons should be visible as there are stemmata
        cy.get('#stemma-editor-graph-container').find('#stemma-selector').find('svg.indicator-svg').should('have.length', tradition.stemmata.length);
        // test that the stemma svg appears
        cy.get('#graph').find('svg').should('be.visible').and('have.length', 1);
        // no box should be there, at first;
        cy.get('#stemma-editor-container').should('not.be.visible');

        // stemma edit buttons should be visible
        cy.get('edit-stemma-buttons').within( ()=> {
            cy.get('a#edit-stemma-button-link').should('be.visible');
            cy.get('a#add-stemma-button-link').should('be.visible');
            cy.get('a#delete-stemma-button-link').should('be.visible');
        });
        // Upon edit, svg and box should be there.
        cy.get('a#edit-stemma-button-link').wait(500).click();
        cy.get('#stemma-editor-container').as('editorbox');
        cy.get('@editorbox').should('be.visible');
        cy.get('#graph').find('svg').as('stemmasvg');
        cy.get('@stemmasvg').should('be.visible').and('have.length', 1);

        // Upon a change in the left box (a valid dot, link btw x and y), verify that svg is just different.
        // count edges should be plus one

        // get the editor box and its content
        cy.wait(1000); // to wait before is crucial, as it seems
        cy.get('@editorbox').find('textarea#stemma-dot-editor').invoke('val').then(v => cy.log('old val: ' + v));
        // remember the content
        cy.get('@editorbox').find('textarea#stemma-dot-editor').invoke('val').then(v => {
            cy.log('old val: ' + v);
            // remember the number of its edges "->"
            let countarrows = (v.match(/->/g) || []).length;
            cy.log('count -> arrows in editor: ' + countarrows); // 20

            // get the graph's svg and remember the number of its nodes and edges
            cy.get('div#graph > svg').as('graph-svg');
            cy.get('@graph-svg').find('g.edge').should('have.length', countarrows);

            // change the edit box's content

            /* // to the last leaf, add a NEWNODE
            // last leaf:       -> S; }

            // const rx = /(\s*->\s*)("?\w+"?)(;\s*})/
            // const match = v.match(rx);
            // cy.log('match[1]: ' + match[1] + ', match[2]: ' + match[2] + ', match[3]: ' + match[3]);
            // const lastleaf = match[2] + ' -> ' + ' "NEWNODE" ; "NEWNODE" [class=extant] ;' ;
            // const newdotcontent = v.replace('}', lastleaf + '\n}');

            // change the whole content: still the svg is not updated
            const newdotcontent = `digraph "stemma of Tomas" {
"α" [class=hypothetical];
G [class=extant];
"δ" [class=hypothetical];
K [class=extant];
C [class=extant];
S [class=extant];
"γ" [class=hypothetical];
"3" [class=hypothetical label="*"];
P [class=extant];
A [class=extant];
H [class=extant];
"4" [class=hypothetical label="*"];
B [class=extant];
F [class=extant];
Q [class=extant];
D [class=extant];
"7" [class=hypothetical label="*"];
E [class=extant];
"5" [class=hypothetical label="*"];
"2" [class=hypothetical label="*"];
T [class=extant];
NEWNODE [class=extant];
"α" -> "δ";
"γ" -> "3";
"γ" -> "4";
"5" -> K;
"5" -> Q;
"4" -> D;
"7" -> E;
"5" -> "7";
"7" -> G;
"α" -> T;
"α" -> A;
"3" -> F;
"2" -> B;
"4" -> "5";
"3" -> H;
"δ" -> "γ";
"2" -> C;
"δ" -> "2";
B -> P;
B -> S;
S -> NEWNODE;
}` 

cy.wait(1000);
cy.get('textarea#stemma-dot-editor').invoke('val', newdotcontent);
cy.get('textarea#stemma-dot-editor').type('{moveToEnd} ');
*/

            const appendatend = 'TESTNODE [class=extant];\nS -> TESTNODE;\n';
            // type() it and svg is updated
            cy.get('textarea#stemma-dot-editor').type('{moveToEnd}{leftArrow}' + appendatend);
            cy.wait(1000);

            // get the graph's svg again and assert the number of its edges to be one more than before
            cy.get('div#graph > svg').find('g.edge').should('have.length', countarrows+1); // 21
        });

    });
});
