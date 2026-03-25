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
Cypress.Commands.add(
  'loginViaUi',
  {
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000
  },
  (userObj) => {
    if (Cypress.browser.isHeadless) {
      // Sign-in with google recaptcha v3 in headless mode --> "TypeError: Cannot read properties of null (reading 'message')"
      cy.once('uncaught:exception', (err) => {
        if (err.message.includes('Cannot read properties of null')) {
          return false;
        }
      });
    }
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

// delete all traditions and users and re-upload them to the api
Cypress.Commands.add('reseedDB', () => {
  cy.log(
    'reseed the db:: delete all traditions and users, then refill with init_test_data'
  );
  cy.log('CY_STEMMAREST_ENDPOINT: ' + Cypress.env('CY_STEMMAREST_ENDPOINT'));

  // Delete all traditions and users found in the api
  cy.log('Delete all traditions:');
  cy.request(Cypress.env('CY_STEMMAREST_ENDPOINT') + '/traditions').then(
    (resp) => {
      // cy.log('resp.body: ' + JSON.stringify(resp.body))
      // cy.log('resp.body(1): ' + JSON.stringify(resp.body[1].id))
      cy.wrap(resp.body).each((tradition) => {
        // cy.log('trad_id, trad_name: ' + tradition.id + ', ' + tradition.name)
        cy.exec(
          'curl -X DELETE ' +
            Cypress.env('CY_STEMMAREST_ENDPOINT') +
            '/tradition/' +
            tradition.id
        ).then((result) => {
          cy.log('curl result .code, .stdout, .stderr:');
          cy.log(result.code);
          cy.log(result.stdout);
          cy.log(result.stderr);
        });
      });
    }
  );
  // cy.reload() // DON'T <== Cannot read properties of undefined (reading 'name'). Issue # 169
  cy.log('All traditions deleted.');

  cy.log('Delete all users:');
  cy.request(Cypress.env('CY_STEMMAREST_ENDPOINT') + '/users').then((resp) => {
    cy.wrap(resp.body).each((user) => {
      cy.log(
        'user_id, user_email, user_role: ' +
          user.id +
          ', ' +
          user.email +
          ', ' +
          user.role
      );
      cy.exec(
        'curl -X DELETE ' +
          Cypress.env('CY_STEMMAREST_ENDPOINT') +
          '/user/' +
          user.id
      ).then((result) => {
        cy.log('curl result .code, .stdout, .stderr:');
        cy.log(result.code);
        cy.log(result.stdout);
        cy.log(result.stderr);
      });
    });
  });
  cy.log('All users deleted.');

  // re-seed the db
  if (Cypress.browser.isHeaded) {
    // skip when in headless mode
    cy.log('Cypress.browser.isHeaded? ' + Cypress.browser.isHeaded);
    cy.exec('./../bin/init-data/stemmarest/init_test_data.sh', {
      env: { STEMMAREST_ENDPOINT: Cypress.env('CY_STEMMAREST_ENDPOINT') }
    }).then(function (result) {
      cy.log(result.code);
      cy.log(result.stdout);
      cy.log(result.stderr);
    });
  } else {
    cy.log('Cypress.browser.isHeaded? ' + Cypress.browser.isHeaded); // browser.isHeadless? true
    cy.exec(
      './cypress/.initdata4headless/init_test_data.sh', // from a volume, cf. docker-compose.test.yml
      { env: { STEMMAREST_ENDPOINT: Cypress.env('CY_STEMMAREST_ENDPOINT') } }
    ).then(function (result) {
      cy.log(result.code);
      cy.log(result.stdout);
      cy.log(result.stderr);
    });
  }

  cy.reload(); // TO DO: assert adding a tradition in the gui leads to automatic update of listed traditions
  cy.log('db re-seeded');
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
    // newAccess: make a Private tradition Public (v.vs.) by .check() / .uncheck()
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
      if (tradition.access === 'Public') {
        // input checkbox Access
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('be.checked'); // "Allow Public Access" yes/no Public/Private
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"]')
          .uncheck('access');
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('not.be.checked');
      } else if (tradition.access === 'Private') {
        // input checkbox Access
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"][value="access"]')
          .should('not.be.checked'); // "Allow Public Access" yes/no Public/Private
        cy.get('@propsDialogModal')
          .find('input[type="checkbox"]')
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
  cy.get('stemmaweb-dialog').should('exist').and('not.be.visible');
});
