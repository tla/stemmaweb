// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Login via user interface
Cypress.Commands.add('loginViaUi', { defaultCommandTimeout: 10000, requestTimeout: 10000, responseTimeout: 10000 }, (userObj) => {
    if (Cypress.browser.isHeadless){
        // Sign-in with google recaptcha v3 in headless mode --> "TypeError: Cannot read properties of null (reading 'message')"
        cy.once('uncaught:exception', (err) => {
            if (err.message.includes('Cannot read properties of null')) {
                return false
            }
        })
    }
    cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);
    cy.contains('header a', 'Sign in').click();
    cy.get('#loginEmail').wait(500).type(userObj.username, { delay: 50 });
    cy.get('#loginPassword').wait(500).type(userObj.password, { delay: 50 });
    cy.wait(500);
    cy.get('button').contains('Sign in').wait(500).click();
    cy.get('#authModal').wait(1000).should('not.be.visible');
    cy.contains('Logged in as ' + userObj.username);
    cy.contains('header a', 'Sign out');
    cy.get('header').should('not.contain', 'Sign in');
    cy.log('Signed in as ' + userObj.username + '!');
});

// Logout via user interface
Cypress.Commands.add('logoutViaUi', () => {
    cy.contains('header a', 'Sign out').click();
    cy.contains('header a', 'Sign in');
    cy.get('header').should('not.contain', 'Sign out');
});

// delete all traditions and users and re-upload them to the api
Cypress.Commands.add('reseedDB', () => {
    cy.log('reseed the db:: delete all traditions and users, then refill with init_test_data')
    cy.log('CY_STEMMAREST_ENDPOINT: ' + Cypress.env('CY_STEMMAREST_ENDPOINT'))

    // Delete all traditions and users found in the api
    cy.log('Delete all traditions:')
    cy.request(Cypress.env('CY_STEMMAREST_ENDPOINT') + '/traditions').then((resp) => {
    // cy.log('resp.body: ' + JSON.stringify(resp.body))
    // cy.log('resp.body(1): ' + JSON.stringify(resp.body[1].id))
    cy.wrap(resp.body).each( (tradition) => {
        // cy.log('trad_id, trad_name: ' + tradition.id + ', ' + tradition.name)
        cy.exec('curl -X DELETE ' + Cypress.env('CY_STEMMAREST_ENDPOINT') + '/tradition/' + tradition.id)
        .then(result => {
        cy.log('curl result .code, .stdout, .stderr:')
        cy.log(result.code)
        cy.log(result.stdout)
        cy.log(result.stderr)
        })
    })
    })
    // cy.reload() // DON'T <== Cannot read properties of undefined (reading 'name'). Issue # 169
    cy.log('All traditions deleted.')

    cy.log('Delete all users:')
    cy.request(Cypress.env('CY_STEMMAREST_ENDPOINT') + '/users').then((resp) => {
    cy.wrap(resp.body).each( (user) => {
        cy.log('user_id, user_email, user_role: ' + user.id + ', ' + user.email + ', ' + user.role)
        cy.exec('curl -X DELETE ' + Cypress.env('CY_STEMMAREST_ENDPOINT') + '/user/' + user.id)
        .then(result => {
        cy.log('curl result .code, .stdout, .stderr:')
        cy.log(result.code)
        cy.log(result.stdout)
        cy.log(result.stderr)
        })
    })
    })
    cy.log('All users deleted.')

    // re-seed the db
    if (Cypress.browser.isHeaded) { // skip when in headless mode
    cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded);
    cy.exec('./../bin/init-data/stemmarest/init_test_data.sh',
        { env: { STEMMAREST_ENDPOINT: Cypress.env('CY_STEMMAREST_ENDPOINT') } }
    ).then(function(result) {
        cy.log(result.code)
        cy.log(result.stdout)
        cy.log(result.stderr)
    })
    } else {
    cy.log("Cypress.browser.isHeaded? " + Cypress.browser.isHeaded); // browser.isHeadless? true
    cy.exec('./cypress/.initdata4headless/init_test_data.sh', // from a volume, cf. docker-compose.test.yml
        { env: { STEMMAREST_ENDPOINT: Cypress.env('CY_STEMMAREST_ENDPOINT') } }
    ).then(function(result) {
        cy.log(result.code)
        cy.log(result.stdout)
        cy.log(result.stderr)
    })
    }

    cy.reload() // TO DO: assert adding a tradition in the gui leads to automatic update of listed traditions
    cy.log('db re-seeded')

});

// Click a modal button
Cypress.Commands.add('clickModalButton', ([dialogLabel, buttonLabel]) => {
    cy.get('#modalDialogLabel').contains(dialogLabel).parents('#modalDialog').as('propertiesModal')
    cy.get('@propertiesModal').contains('button', buttonLabel).should('be.visible').wait(500).click()
});


// assert editing properties of own or others' traditions differs correctly
// diff user,role, tradition, owner, access
Cypress.Commands.add('editProperties', ([dialogLabel, u_name, u_role, t_title, t_owner, t_access]) => {
    cy.log('dialogLabel: ' + dialogLabel)
    cy.log('u_name: ' + u_name)
    cy.log('u_role:' + u_role)
    cy.log('t_owner: ' + t_owner)
    cy.log('t_access: ' + t_access)

    // 'Edit properties' modal is visible
    cy.contains('h5#modalDialogLabel', dialogLabel).parents('#modalDialog', { timeout : 1000 }).should('be.visible').as('propsDialogModal')
    const newName = t_title + ' EDITED'
    // newAccess: make a Private tradition Public (v.vs.) by .check() / .uncheck()
    const newLanguage = 'Another language'
    const newDirection = 'BI'
    const newDirectionText = 'Bi-directional'
    const newWitnesses = 'X, Y, Z'
    // 'Edit properties' values are editable
    if (t_owner === u_name && t_access === 'Public') {
        // input text Name
        cy.get('@propsDialogModal').find('#name_input').invoke('val', newName)
        cy.get('@propsDialogModal').find('#name_input').invoke('val').should('eq', newName)
        // input checkbox Access
        cy.get('@propsDialogModal').find('input[type="checkbox"][value="access"]').should('be.checked'); // Public vs. Private
        cy.get('@propsDialogModal').find('input[type="checkbox"]').uncheck('access');
        cy.get('@propsDialogModal').find('input[type="checkbox"][value="access"]').should('not.be.checked');
        // input text Language
        cy.get('@propsDialogModal').find('#language_input').invoke('val', newLanguage)
        // select option direction, values LR, RL, BI
        cy.get('@propsDialogModal').find('select#direction_input').should('have.value', 'LR').select('BI').should('have.value', newDirection);
        cy.get('@propsDialogModal').find('select#direction_input').should('have.value', 'BI');
        cy.get('@propsDialogModal').find('select#direction_input').find('option:selected').should('contain', newDirectionText);
        // input text Witnesses
        cy.get('@propsDialogModal').find('#witnesses_input').invoke('val', newWitnesses)

        // TODO: save it (currently only admin can save edited properties)
        cy.get('@propsDialogModal').contains('button', 'Save')
            .should('exist') // Ensure the button exists
            .and('be.visible') // Ensure the button is visible
            .and('not.be.disabled') // Ensure the button is enabled
            // .click(); // Click the button
            // (uncaught exception) TypeError: Cannot read properties of null (reading 'value')

        // close the modal (for now, until 'Save' is possible for role:user)
        // cy.pause()
        cy.clickModalButton(['Edit properties', 'Close'])
        // TODO: assert that the changed tradition name is visible in the navigation bar.
        // TODO: assert that after visiting other traditions, the changes are still at the right places, in the toc and in the props.

    }

});
