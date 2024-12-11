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
describe('login and logout with authentication modal, captcha v3 and fetch(POST)', () => {
  it('passes in headless mode local and on github. passes in local headed mode', { defaultCommandTimeout: 10000, requestTimeout: 10000, responseTimeout: 10000 }, () => {

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
});

// some fetch(POST) for headless mode
describe('addStemma and deleteStemma with login, passes in headless mode despite fetch(POST)', () => {
  it('passes in headless mode local and on github. passes in local headed mode. with original guest config', {}, () => {
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

    cy.logoutViaUi();
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

describe('delete all traditions and users in the api, re-seed the db', () => {
  it.only('UNDER CONSTRUCTION', () => {
    // cy.log('cy envs', JSON.stringify(Cypress.env()))
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
          cy.log('curl result .log, .stdout, .stderr:')
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
          cy.log('curl result .log, .stdout, .stderr:')
          cy.log(result.code)
          cy.log(result.stdout)
          cy.log(result.stderr)
        })
      })
    })
    cy.log('All users deleted.')

    // re-seed the db
    if (Cypress.env('CY_MODE') === 'headed') { // skip when in headless mode
      cy.exec('./../bin/init-data/stemmarest/init_test_data.sh',
        { env: { STEMMAREST_ENDPOINT: Cypress.env('CY_STEMMAREST_ENDPOINT') } }
      ).then(function(result) {
        cy.log(result.code)
        cy.log(result.stdout)
        cy.log(result.stderr)
      })
    } else {
      cy.exec('./cypress/.initdata4headless/init_test_data.sh', // currently from a volume, cf. docker-compose.test.yml
        { env: { STEMMAREST_ENDPOINT: Cypress.env('CY_STEMMAREST_ENDPOINT') } }
      ).then(function(result) {
        cy.log(result.code)
        cy.log(result.stdout)
        cy.log(result.stderr)
      })
    }

    cy.reload() // TO DO: assert adding a tradition in the gui leads to automatic update of listed traditions
    cy.log('db re-seeded')

  })
})