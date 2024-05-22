// attempts to solve problems with cypress that occur on github actions but not locally

import test_traditions from '../fixtures/test_traditions.json';
import users from '../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];

beforeEach(() => {
  cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
  cy.viewport(1600, 900);
  test_traditions.sort( (tradition_a, tradition_b) => tradition_a.title.localeCompare( tradition_b.title ) );
});

// some fetch(POST) for headless mode
describe('run some fetch(POST) requests', () => {
  it.skip('login and logout', { defaultCommandTimeout: 10000, requestTimeout: 10000, responseTimeout: 10000 }, () => {
    // Login is in <ROOT>/middleware/stemmaweb_middleware/controller/auth/routes.py
    /* @blueprint.route("/login", methods=["POST"])
    def login():
        body_or_error = try_parse_model(models.LoginUserDTO, request)
        if isinstance(body_or_error, Response):
            return body_or_error

        body: models.LoginUserDTO = body_or_error
        user_or_none = service.user_credentials_valid(body)
        if user_or_none is None:
            return abort(status=401, message="Invalid credentials or no such user")

        # Verify captcha
        if not recaptcha_verifier.verify(body.recaptcha_token):
            return abort(status=429, message="reCAPTCHA verification failed")

        # Login user for this flask session
        user: StemmawebUser = user_or_none
        auth_user = AuthUser(user)
        flask_login.login_user(auth_user)

        return success(status=200, body=user)

     */

    cy.log('LOGIN:')
    cy.log("Cypress.env('CY_MODE'): " + Cypress.env('CY_MODE'));
    cy.contains('header a', 'Sign in').click();
    cy.get('#loginEmail').wait(500).type(admin.username, { delay: 50 });
    cy.get('#loginPassword').wait(500).type(admin.password, { delay: 50 });
    cy.get('button').contains('Sign in').wait(500).click();
    cy.get('#authModal').should('not.be.visible');
    cy.contains('Logged in as ' + admin.username);
    cy.contains('header a', 'Sign out');
    cy.get('header').should('not.contain', 'Sign in');
    cy.log('Signed in as ' + admin.username + '!');

    cy.log('LOGOUT:')
    cy.log("Cypress.env('CY_MODE'): " + Cypress.env('CY_MODE'));
    cy.contains('header a', 'Sign out').click();
    cy.contains('header a', 'Sign in');
    cy.get('header').should('not.contain', 'Sign out');
  })

  it.skip('addStemma (and deleteStemma)', {}, () => { // would currently fail in github actions
    // addStemma is defined in <ROOT>/frontend/www/src/js/modules/common/service/stemmarestService.js
    // and applied in <ROOT>/frontend/www/src/js/modules/dashboard/tradition/stemma/editStemma.js
    /* return this.fetch(`/api/tradition/${tradId}/stemma/`, {
      method: 'POST',
      body: JSON.stringify( formData ),
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
     */

    // need for login skipped in <ROOT>/frontend/www/src/js/modules/common/service/stemmarestService.js
    cy.loginViaUi(admin);
    const tradition = test_traditions.find(trad => trad.title.startsWith('John verse'));
    cy.log('tradition.title: ' + tradition.title);
    // click on the tradition title within the tradition list
    cy.get('#traditions-list').contains(tradition.title).click();

    // John verse has no stemma svg at start
    // click on the add stemma symbol
    cy.get('#add-stemma-button-link').wait(500).click();
    // click on the save stemma symbol
    cy.get('#save-stemma-button-link').wait(500).click(); // POST instead of PUT
    //wait a bit to see it
    cy.wait(2000);
    // delete it again
    cy.get('#delete-stemma-button-link').wait(500).click(); // DELETE method
    cy.contains('Yes, delete it').wait(500).click();

    cy.logoutViaUi(admin);

  });
});

// does intercept work at all on github actions?
describe('intercept traditions', () => {
  it.skip('fails on github, passes locally', () => {
    cy.intercept(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/api/traditions`).as('apiCheck');
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.log('CY_STEMMAWEB_FRONTEND_URL: ' + `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.wait('@apiCheck').then((interception) => {
      assert.isNotNull(interception.response.body, '1st API call has data')
    });
  });
});

describe('intercept login request', () => {
  if (Cypress.env('CY_MODE') === 'headed') { // skip when in headless mode
    it.skip('passes in headed mode but fails in headless mode: run only in headed mode', { defaultCommandTimeout: 10000 }, () => {
      cy.log("Cypress.env('CY_MODE'): " + Cypress.env('CY_MODE'));

      cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
      cy.viewport(1600, 900);

      cy.intercept('POST', `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/requests/login`).as('loginrequest');

      cy.get('header').contains('a', 'Sign in').wait(500).click();
      cy.get('#loginEmail').wait(500).type('user@example.org', { delay: 50 });
      cy.get('#loginPassword').wait(500).type('UserPass', { delay: 50 });
      cy.get('auth-modal').contains('button', 'Sign in').wait(500).click();

      cy.wait('@loginrequest').then(interception => {
        // const res_str = JSON.stringify(interception.response);
        // cy.log('res_str: ' + res_str);
        cy.expect(interception.response.statusCode).to.eq(200);
      });

      cy.get('header').contains('a', 'Logged in as user@example.org');
      cy.get('header').should('not.contain', 'Sign in');
      cy.get('header').contains('a', 'Sign out'); // for now, don't click without interception
    });
  }
});
