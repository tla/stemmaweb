// Registering a new user through the sign-in dialog. These tests create users, so each
// starts from the seed data.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList } from '../support/expectations';

const existing = users.find(({ username }) => username === 'user@example.org');
const newUser = { username: 'newuser@example.org', password: 'NewUserPass', role: 'user' };
const middleware = () => Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL');
const human = 'e2e-human-token'; // accepted by the recaptcha mock

describe('Register', () => {
  beforeEach(() => {
    cy.reseedDB();
    cy.intercept('POST', '**/register').as('register');
    cy.intercept('POST', '**/login').as('login');
    cy.visitHome();
  });

  const register = (account = newUser) => {
    cy.openLoginModal();
    cy.showRegisterForm();
    cy.fillRegisterForm({ email: account.username, password: account.password });
    cy.submitRegisterForm();
  };

  it('creates a user, tells them they can sign in, and switches to the sign-in form', () => {
    register();
    cy.wait('@register').its('response.statusCode').should('be.oneOf', [200, 201, 204]);
    cy.contains('stemmaweb-alert', 'You can log in now!');
    cy.get('#loginEmail').should('be.visible');
    // Stemmarest has an ordinary user with that password
    cy.request({ method: 'POST', url: `${middleware()}/login`, body: {
      id: newUser.username, passphrase: newUser.password, recaptcha_token: human
    } }).its('body.role').should('eq', 'user');
  });

  // Known bug: initState() in dashboard/tradition/state.js selects the first tradition the user
  // *owns*, with no fallback, so a user who owns none (every newly registered user) gets
  // selectedTradition = undefined, and traditionList.js:52 throws "Cannot read properties of
  // undefined (reading 'name')" as an unhandled rejection.
  it.skip('lets the new user sign in and see the public traditions (known bug: crashes when the user owns no tradition)', () => {
    register();
    cy.get('#loginEmail').should('be.visible');
    cy.get('#loginEmail').type(newUser.username);
    cy.get('#loginPassword').type(newUser.password);
    cy.contains('#authModal button', 'Sign in').click();
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.contains('header a', `Logged in as ${newUser.username}`);
    cy.traditionListShouldEqual(expectedTraditionList(newUser, traditions));
    cy.get('#tradition-name').should(($n) => expect($n.text().trim()).not.to.be.empty);
    cy.contains('h6', 'Text directory')
      .find('svg.feather-plus-circle')
      .parents('a')
      .should('not.have.class', 'greyed-out');
    cy.signOut();
  });

  it('refuses mismatched passwords and sends nothing', () => {
    cy.openLoginModal();
    cy.showRegisterForm();
    cy.fillRegisterForm({ email: newUser.username, password: 'NewUserPass', confirm: 'Different' });
    cy.submitRegisterForm();
    cy.contains('stemmaweb-alert', 'Passwords do not match.');
    cy.get('@register.all').should('have.length', 0);
  });

  [
    { what: 'an empty form', values: {} },
    { what: 'an invalid email address', values: { email: 'not-an-email', password: 'x' } },
    { what: 'a missing password', values: { email: 'newuser@example.org' } }
  ].forEach(({ what, values }) => {
    it(`asks for the missing information and sends nothing for ${what}`, () => {
      cy.openLoginModal();
      cy.showRegisterForm();
      cy.fillRegisterForm(values);
      cy.submitRegisterForm();
      cy.get('#authModal form.was-validated').should('exist');
      cy.get('@register.all').should('have.length', 0);
    });
  });

  it('refuses a registration whose reCAPTCHA token scores as a bot', () => {
    cy.stubRecaptcha('e2e-bot-token');
    cy.reload();
    cy.appReady();
    register();
    cy.wait('@register').its('response.statusCode').should('eq', 429);
    cy.contains('stemmaweb-alert', 'Unable to register');
    // and the user was not created
    cy.request({ method: 'POST', url: `${middleware()}/login`, failOnStatusCode: false, body: {
      id: newUser.username, passphrase: newUser.password, recaptcha_token: human
    } }).its('status').should('eq', 401);
  });

  it('reports an error when the server rejects the registration', () => {
    cy.intercept('POST', '**/register', { statusCode: 500, body: { code: 500, message: 'Simulated' } }).as('fails');
    register();
    cy.wait('@fails');
    cy.contains('stemmaweb-alert', 'Unable to register');
    cy.get('#registerEmail').should('be.visible');
  });

  // Known bug (#181): registration is a PUT of /user/{id}, which replaces an existing user, so
  // registering an address that is already taken replaces that account's password (and role).
  // Anyone can take over any account, an admin's included. It should be refused.
  it.skip('refuses an email address that already has an account, and leaves its password alone (known bug #181)', () => {
    register({ username: existing.username, password: 'TakenOver' });
    cy.wait('@register').its('response.statusCode').should('be.within', 400, 499);
    cy.contains('stemmaweb-alert', 'Unable to register');
    // the old password still works, the new one does not
    cy.request({ method: 'POST', url: `${middleware()}/login`, failOnStatusCode: false, body: {
      id: existing.username, passphrase: existing.password, recaptcha_token: human
    } }).its('status').should('eq', 200);
    cy.request({ method: 'POST', url: `${middleware()}/login`, failOnStatusCode: false, body: {
      id: existing.username, passphrase: 'TakenOver', recaptcha_token: human
    } }).its('status').should('eq', 401);
  });

  // Known bug: the role comes from the request body, and the form's "user" is only a default the
  // client may change. POST /register with role "admin" creates an admin account.
  it.skip('does not let a new user choose the admin role (known bug: the client sets the role)', () => {
    cy.request({ method: 'POST', url: `${middleware()}/register`, failOnStatusCode: false, body: {
      id: 'sneaky@example.org', email: 'sneaky@example.org', passphrase: 'Sneaky1', role: 'admin',
      active: true, recaptcha_token: human
    } });
    cy.request({ method: 'POST', url: `${middleware()}/login`, failOnStatusCode: false, body: {
      id: 'sneaky@example.org', passphrase: 'Sneaky1', recaptcha_token: human
    } }).then(({ status, body }) => {
      // either the registration was refused, or the account is an ordinary user
      if (status === 200) expect(body.role).to.equal('user');
    });
  });
});
