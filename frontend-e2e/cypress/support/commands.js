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

// Replace Google's reCAPTCHA v3 script with a stub that hands out a fixed token.
// The middleware verifies the token against the local `recaptcha` mock service
// (see docker-compose.test.yml), so the real verification path is still exercised.
// 'e2e-human-token' is accepted (score 0.9); 'e2e-bot-token' is rejected (score 0.1).
Cypress.Commands.add('stubRecaptcha', (token = 'e2e-human-token') => {
  cy.intercept('GET', 'https://www.google.com/recaptcha/api.js*', {
    headers: { 'content-type': 'application/javascript' },
    body: `window.grecaptcha = {
      ready: (callback) => callback(),
      execute: () => Promise.resolve('${token}')
    };`
  });
});

// Login via user interface
Cypress.Commands.add(
  'loginViaUi',
  {
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000
  },
  (userObj) => {
    /* if (Cypress.browser.isHeadless) {
      // Sign-in with google recaptcha v3 in headless mode --> "TypeError: Cannot read properties of null (reading 'message')"
      cy.once('uncaught:exception', (err) => {
        if (err.message.includes('Cannot read properties of null')) {
          return false;
        }
      });
    } */
    cy.log('Cypress.browser.isHeaded? ' + Cypress.browser.isHeaded);
    cy.log('userObj.username: ' + userObj.username)
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
  }
);

// Logout via user interface
Cypress.Commands.add('logoutViaUi', () => {
  cy.contains('header a', 'Sign out').click();
  cy.contains('header a', 'Sign in');
  cy.get('header').should('not.contain', 'Sign out');
});

// Delete all traditions and users, then reload the mini test data set (see seed.js)
Cypress.Commands.add('reseedDB', () => {
  cy.task('reseedDB', null, { timeout: 120000 });
});

// Click a modal button
Cypress.Commands.add('clickModalButton', ([dialogLabel, buttonLabel]) => {
  cy.get('#modalDialogLabel')
    .contains(dialogLabel)
    .parents('#modalDialog')
    .as('propertiesModal');
  cy.get('@propertiesModal')
    .contains('button', buttonLabel)
    .should('be.visible')
    .wait(500)
    .click();
});

// assert editing properties of own or others' traditions differs correctly
// diff user,role, tradition, owner, access
// TODO: assert the tradition properties belong to the right tradition (tradition name in the properties equals the clicked one in the tradition list)
Cypress.Commands.add(
  'editProperties',
  ([dialogLabel, u_name, u_role, tradition]) => {
    cy.log('dialogLabel: ' + dialogLabel);
    cy.log('u_name: ' + u_name);
    cy.log('u_role:' + u_role);
    cy.log('tradition.owner: ' + tradition.owner);

    // Tradition properties to be editable: title, access, language, direction.
    cy.log('tradition.title: ' + tradition.title);
    cy.log('tradition.access: ' + tradition.access);
    cy.log('tradition.language: ' + tradition.language);
    cy.log('tradition.direction: ' + tradition.direction);

    // 'Edit properties' modal is visible
    cy.contains('h5#modalDialogLabel', dialogLabel)
      .parents('#modalDialog', { timeout: 1000 })
      .should('be.visible')
      .as('propsDialogModal');
    const newName = '"EDITED" ' + tradition.title;
    const newLanguage = 'Another language for ' + tradition.title;
    const newDirection = 'BI'; // none of the test traditions is bi-directional originally
    const newDirectionText = 'Bi-directional';

    // 'Edit properties' values are editable
    if ((tradition.owner === u_name && u_role === 'user') || u_role === 'admin') {
      // insert new tradition title
      cy.get('@propsDialogModal').find('#name_input').invoke('val', newName);
      cy.get('@propsDialogModal')
        .find('#name_input')
        .invoke('val')
        .should('eq', newName);

      // newAccess: make a Private tradition Public (v.vs.) by .check() / .uncheck()
      if (tradition.access === 'Public') {
        // input checkbox Access
        cy.log("tradition.access === 'Public'")
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('be.checked'); // "Allow Public Access" yes/no Public/Private
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .uncheck('access');
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('not.be.checked');
      } else if (tradition.access === 'Private') {
        // input checkbox Access
        cy.log("tradition.access === 'Private'")
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('not.be.checked'); // "Allow Public Access" yes/no Public/Private
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .check('access');
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('be.checked');
      }

      // input text Language
      cy.get('@propsDialogModal')
        .find('#language_input')
        .invoke('val', newLanguage);
      // select option direction, values LR, RL, BI
      cy.get('@propsDialogModal')
        .find('select#direction_input')
        .should('have.value', 'LR') // all test traditions originally say direction LR
        .select('BI')
        .should('have.value', newDirection);
      cy.get('@propsDialogModal')
        .find('select#direction_input')
        .should('have.value', 'BI');
      cy.get('@propsDialogModal')
        .find('select#direction_input')
        .find('option:selected')
        .should('contain', newDirectionText);

      // Save the changes
      cy.get('@propsDialogModal')
        .contains('button', 'Save')
        .should('exist') // Ensure the button exists
        .and('be.visible') // Ensure the button is visible
        .and('not.be.disabled') // Ensure the button is enabled
        .click(); // Click the button
      // the modal should have closed by itself
      cy.get('@propsDialogModal').should('not.be.visible');

      // TODO: assert that the changed tradition name newName is visible in the navigation bar.
      // TODO: assert that all edited tradition properties are updated: Name, access, language, direction.
      // TODO: assert that after visiting other traditions, the changes are still at the right places, in the toc and in the props.
    }
  }
);

Cypress.Commands.add('assertPointerEventsDisabledForLabel', (buttontext) => {
  // cy.get(selector).should('have.css', 'pointer-events', 'none');

  cy.get('stemma-buttons').find('button').contains(buttontext).as('btn');
  // the button's feature is "not being offered"
  cy.get('@btn').should('have.class', 'disabled');
  // cy.get('@btn').click() // cy.click() failed because this element: button id="delete-tradition-button"... /button>has CSS pointer-events: none
  cy.get('@btn').should('have.css', 'pointer-events', 'none');
  cy.get('stemmaweb-dialog > div').should('exist').and('not.be.visible');
});
