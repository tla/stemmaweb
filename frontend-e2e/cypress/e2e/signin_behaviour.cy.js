/* Sign in/Register testing:
    - User can't log in with the hash string
    - User can log in with password UserPass
    - User can log out again
    - A new user can be created (I used newuser@example.org / NewUserPass)
    - The new user can then log in

    // - Creating user with existing name/id should fail. Don't overwrite users' passwords by re-registering existing ids.
*/


beforeEach(() => {
  cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

describe('User can\'t log in with the hash string', () => {
  it('passes', () => {
    cy.contains('Sign in').click();
    cy.wait(500);
    cy.get('#loginEmail').type('user@example.org', { delay: 50 });
    cy.wait(500);
    cy.get('#loginPassword').type('0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk', { delay: 50 });
    cy.wait(500);
    // cy.get('#loginEmail').should('have.value', 'user@example.org');
    cy.contains('button', 'Sign in').click();
    cy.contains('Unable to login'); // or assert: (fetch) POST 401 /stemmaweb/requests/login ?
  });
});

describe('User can log in with password UserPass, and log out again', () => {
  it('passes', () => {
    cy.contains('Sign in').click();
    cy.wait(500);
    cy.get('#loginEmail').type('user@example.org', { delay: 50 });
    cy.wait(500);
    cy.get('#loginPassword').type('UserPass', { delay: 50 });
    cy.wait(500);
    cy.contains('button', 'Sign in').click();
    cy.wait(500);
    cy.contains('Logged in as user@example.org');

    cy.log('User can log out again');
    cy.contains('Sign out').click();
    cy.contains('Sign in');
  });
});


describe('A new user can be created', () => {
  it('passes', () => {
    cy.contains('Sign in').click();
    cy.contains('Register').click();

    cy.wait(500);
    cy.get('#registerEmail').type('newuser@example.org', { delay: 50 });
    cy.wait(500);
    cy.get('#registerPassword').type('NewUserPass', { delay: 50 });
    cy.wait(500);
    cy.get('#registerConfirmPassword').type('NewUserPass', { delay: 50 });
    cy.wait(500);
    cy.contains('button', /Sign (u|U)p/).click();
    // cy.contains('button', 'Sign up').click();

    cy.log('The new user can then log in');
    cy.wait(500);
    cy.get('#loginEmail').type('newuser@example.org', { delay: 50 });
    cy.wait(500);
    cy.get('#loginPassword').type('NewUserPass', { delay: 50 });
    cy.wait(500);
    cy.contains('button', 'Sign in').click();
    cy.contains('Logged in as newuser@example.org');

    cy.log('The new user can log out again');
    cy.contains('Sign out').click();
    cy.contains('Sign in');

  });
});

// The new user can then log in
describe('The new user can then log in, and log out again', () => {
  it('passes', () => {
    cy.contains('Sign in').click();
    cy.wait(500);
    cy.get('#loginEmail').type('newuser@example.org', { delay: 50 });
    cy.wait(500);
    cy.get('#loginPassword').type('NewUserPass', { delay: 50 });
    cy.wait(500);
    cy.contains('button', 'Sign in').click();
    cy.contains('Logged in as newuser@example.org');

    cy.log('The new user can log out again');
    cy.contains('Sign out').click();
    cy.contains('Sign in');
  });
});