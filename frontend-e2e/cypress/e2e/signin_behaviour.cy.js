/* Sign in/Register testing:
    - User can't log in with the hash string
    - User can log in with password UserPass
    - User can log out again
    - A new user can be created (I used newuser@example.org / NewUserPass)
      // newuser + current date+time, because at the moment user names can be overwritten,
      // later it should not be possible to create a user with a name that is already registered.
    - The new user can then log in

    // - Creating user with existing name/id should fail. Don't overwrite users' passwords by re-registering existing ids.
*/


beforeEach(() => {
  cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
});

describe('User can\'t log in with the hash string', () => {
  it('passes', { defaultCommandTimeout: 10000 }, () => {
    cy.intercept('POST', `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/login`).as('loginrequest');

    // fill in form...
    cy.contains('Sign in').click();
    // cy.wait(500);
    cy.get('#loginEmail').should('be.visible').as('login_email');
    cy.wait(500);
    cy.get('@login_email').type('user@example.org', { delay: 50 });
    // cy.wait(500);
    cy.get('#loginPassword').type('0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk', { delay: 50 });
    // cy.wait(500);
    // cy.get('#loginEmail').should('have.value', 'user@example.org');
    cy.contains('button', 'Sign in').click();

    cy.wait('@loginrequest').then(interception => {
        cy.log(interception.request.url);
        cy.log(interception.response.body);
        expect(interception.response.body.code).to.eq(401); // instead of:  cy.contains('Unable to login');
    });

  });
});

describe('User can log in with password UserPass, and log out again', () => {
  it('passes', { defaultCommandTimeout: 10000 }, () => {
    cy.intercept('POST', `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/login`).as('loginrequest');
    cy.contains('Sign in').click();
    // cy.wait(500);
    cy.get('#loginEmail').should('be.visible').as('login_email');
    cy.wait(500);
    cy.get('@login_email').type('user@example.org', { delay: 50 });
    // cy.wait(500);
    cy.get('#loginPassword').type('UserPass', { delay: 50 });
    // cy.wait(500);
    cy.contains('button', 'Sign in').click();
    // cy.wait(500);

    cy.wait('@loginrequest').then(interception => {
      // const res_str = JSON.stringify(interception.response);
      // cy.log(res_str);
      cy.expect(interception.response.statusCode).to.eq(200);
    });
    cy.contains('Logged in as user@example.org');

    cy.log('User can log out again');
    cy.contains('Sign out').click();
    cy.contains('Sign in');
  });
});

const m = new Date();
const dateString = // YYYY/mm/dd hh:m:sec
    m.getUTCFullYear() + // + "/" +
    ("0" + (m.getUTCMonth()+1)).slice(-2) + // + "/" +
    ("0" + m.getUTCDate()).slice(-2) + // + " " +
    ("0" + m.getUTCHours()).slice(-2) + // + ":" +
    ("0" + m.getUTCMinutes()).slice(-2) + // + ":" +
    ("0" + m.getUTCSeconds()).slice(-2);
const newuser = 'newuser' + dateString + '@example.org';

describe('A new user can be created', () => {
  it.skip('under construction', { defaultCommandTimeout: 10000 }, () => {// to do: set db to initial state: delete user after the tests // elsewise, test is passing locally.
    cy.contains('Sign in').click();
    cy.contains('Register').click();

    // cy.wait(500);
    cy.get('#registerEmail').type(newuser, { delay: 50 });
    // cy.wait(500);
    cy.get('#registerPassword').type('NewUserPass', { delay: 50 });
    // cy.wait(500);
    cy.get('#registerConfirmPassword').type('NewUserPass', { delay: 50 });
    // cy.wait(500);
    cy.contains('button', /Sign (u|U)p/).click();
    // cy.contains('button', 'Sign up').click();

    cy.log('The new user can then log in');
    cy.intercept('POST', `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/login`).as('loginrequest');
    cy.wait(500);
    cy.get('#loginEmail').should('be.visible').as('login_email');
    cy.wait(500);
    cy.get('@login_email').type(newuser, { delay: 50 });
    // cy.wait(500);
    cy.get('#loginPassword').type('NewUserPass', { delay: 50 });
    // cy.wait(500);
    cy.contains('button', 'Sign in').click();
    cy.wait('@loginrequest').then(interception => {
      cy.expect(interception.response.statusCode).to.eq(200);
    });
    cy.contains('Logged in as ' + newuser);

    cy.log('The new user can log out again');
    cy.contains('Sign out').click();
    cy.contains('Sign in');

  });
});

// The new user can then log in
describe('The new user can then log in, and log out again', () => {
  it.skip('under construction', { defaultCommandTimeout: 10000 }, () => { // to do: set db to initial state: delete user after the tests // elsewise, test is passing locally.
    cy.contains('Sign in').click();
    cy.intercept('POST', `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/login`).as('loginrequest');
    cy.wait(500);
    cy.get('#loginEmail').should('be.visible').as('login_email');
    cy.wait(500);
    cy.get('@login_email').type(newuser, { delay: 50 });
    // cy.wait(500);
    cy.get('#loginPassword').type('NewUserPass', { delay: 50 });
    // cy.wait(500);
    cy.contains('button', 'Sign in').click();
    cy.wait('@loginrequest').then(interception => {
      cy.expect(interception.response.statusCode).to.eq(200);
    });
    cy.contains('Logged in as ' + newuser);

    cy.log('The new user can log out again');
    cy.contains('Sign out').click();
    cy.contains('Sign in');
  });
});

describe('Creating a user with an already existing email address, i.e. user id, (whether user or admin) should fail', () => {
  it.skip('issue', { defaultCommandTimeout: 10000 }, () => {
    // to do: set db to initial state: delete user after the tests.

    /* Issue: it is possible to create a new user with an already existing user name and any password,
    the previous password will not work any more.

    TODO:
    if possible, get the example user from a variable, else hard-code 'user@example.org'
    click and type to create a user with the same id.
    The process should not succeed; there should be an error message

    Or, register a user x@y.org with a new password, log in and out,
    register the same username again with the same new password.
    */
  });
});


describe('After logout, the previous login credentials should not be retrieved in the respective input fields', () => {
  it.skip('issue', { defaultCommandTimeout: 10000 }, () => {
    // to do: set db to initial state: delete user after the tests.
    // ...
  });
});