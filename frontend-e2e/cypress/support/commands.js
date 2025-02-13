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
Cypress.Commands.add('loginViaUi', (userObj) => {
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
    cy.get('#authModal').should('not.be.visible');
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
