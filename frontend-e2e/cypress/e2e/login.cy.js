// Signing in and out through the sign-in form. (reCAPTCHA is covered in auth.cy.js.)
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList } from '../support/expectations';

const user = users.find(({ username }) => username === 'user@example.org');
const admin = users.find(({ role }) => role === 'admin');

describe('Sign in form', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/login').as('login');
    cy.visitHome();
  });

  it('signs a user in with their password, and keeps them signed in after a reload', () => {
    cy.loginViaForm(user);
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.get('header').should('not.contain', 'Sign in');
    cy.get('#authModal').should('not.be.visible');
    cy.reload();
    cy.appReady();
    cy.contains('header a', `Logged in as ${user.username}`);
  });

  it('signs an admin in the same way', () => {
    cy.loginViaForm(admin);
    cy.wait('@login').its('response.statusCode').should('eq', 200);
  });

  it('signs the user out, and stays signed out after a reload', () => {
    cy.loginViaForm(user);
    cy.signOut();
    cy.reload();
    cy.appReady();
    cy.contains('header a', 'Sign in');
    cy.get('header').should('not.contain', 'Logged in as');
  });

  it('shows the signed-in user their own traditions, and a guest only the public ones after signing out', () => {
    cy.loginViaForm(user);
    cy.traditionListShouldEqual(expectedTraditionList(user, traditions));
    cy.signOut();
    cy.traditionListShouldEqual(expectedTraditionList(null, traditions));
  });

  [
    { what: 'a wrong password', email: user.username, password: 'NotMyPassword' },
    { what: 'an unknown user', email: 'nobody@example.org', password: 'UserPass' },
    {
      what: 'the stored password hash used as a password',
      email: user.username,
      password: '0NT3bCujDh6wvf5UTfXsjmlRhyEG6xvT1/kgiZPyjGk'
    }
  ].forEach(({ what, email, password }) => {
    it(`refuses ${what}`, () => {
      cy.openLoginModal();
      cy.get('#loginEmail').type(email);
      cy.get('#loginPassword').type(password);
      cy.get('#loginEmail').should('have.value', email);
      cy.contains('#authModal button', 'Sign in').click();
      cy.wait('@login').its('response.statusCode').should('eq', 401);
      cy.contains('stemmaweb-alert', 'Unable to login');
      cy.get('#authModal').should('be.visible');
      cy.get('header').should('not.contain', 'Sign out');
    });
  });

  it('asks for an email address and a password, and sends nothing without them', () => {
    cy.openLoginModal();
    cy.contains('#authModal button', 'Sign in').click();
    cy.get('#authModal form').first().should('have.class', 'was-validated');
    cy.get('@login.all').should('have.length', 0);
    cy.get('#authModal').should('be.visible');
  });

  it('forgets the email and password after signing in, so the next person does not see them (#180)', () => {
    cy.loginViaForm(user);
    cy.signOut();
    cy.openLoginModal();
    cy.get('#loginEmail').should('have.value', '');
    cy.get('#loginPassword').should('have.value', '');
  });

  it('offers signing in with Google and GitHub, and switching to registration', () => {
    cy.openLoginModal();
    cy.get('#authModal social-login-options a:visible').should('have.length', 2);
    cy.get('#authModal social-login-options a:visible').each(($a) => {
      expect($a.attr('href')).to.match(/oauth/i);
    });
    cy.showRegisterForm();
    cy.contains('#authModal a', 'Login').click();
    cy.get('#loginEmail').should('be.visible');
  });
});
