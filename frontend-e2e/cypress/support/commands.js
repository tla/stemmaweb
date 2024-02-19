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
// TODO: also for headless mode
Cypress.Commands.add('loginViaUi', (userObj) => {
    if (Cypress.env('CY_MODE') === 'headed') { // skip when in headless mode
        cy.log("Cypress.env('CY_MODE'): " + Cypress.env('CY_MODE'));
    cy.contains('header a', 'Sign in').click();
    cy.get('#loginEmail').wait(500).type(userObj.username, { delay: 50 });
    cy.get('#loginPassword').wait(500).type(userObj.password, { delay: 50 });
    cy.get('button').contains('Sign in').wait(500).click();
    cy.get('#authModal').should('not.be.visible');
    cy.contains('Logged in as ' + userObj.username);
    cy.contains('header a', 'Sign out');
    cy.get('header').should('not.contain', 'Sign in');
    cy.log('Signed in as ' + userObj.username + '!');
    }
});

// Logout via user interface
// TODO: also for headless mode
Cypress.Commands.add('logoutViaUi', (userObj) => {
    if (Cypress.env('CY_MODE') === 'headed') { // skip when in headless mode
        cy.log("Cypress.env('CY_MODE'): " + Cypress.env('CY_MODE'));
    cy.contains('header a', 'Sign out').click();
    cy.contains('header a', 'Sign in');
    cy.get('header').should('not.contain', 'Sign out');
    }
});
