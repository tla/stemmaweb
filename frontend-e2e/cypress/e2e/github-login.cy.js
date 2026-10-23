// Signing in with GitHub. The middleware talks to the `oauthmock` service instead of
// github.com (see docker-compose.test.yml and oauth_mock/app.py), so the real redirect,
// code exchange, user lookup and registration paths are exercised.
//
// The tests check the session through the middleware's `/user` endpoint rather than the
// page: a user who owns no traditions (as every new GitHub user does) trips a known
// start-up bug in the frontend, see the skipped test in registration.cy.js. That bug's
// error is ignored here (and only that one).
const middleware = () => Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL');
const mock = 'http://oauthmock:8002';

const account = { login: 'e2e-octocat', email: 'octocat@example.org' };

const chooseGithubAccount = ({ login, email }) =>
  cy.request('POST', `${mock}/__test/identity`, { login, email });

// Click the GitHub button. It opens a new tab, which Cypress can't follow, so make the
// link open in this tab instead.
const clickGithubButton = () => {
  cy.openLoginModal();
  cy.get('#authModal a[href$="/oauth-github"]:visible')
    .invoke('removeAttr', 'target')
    .click();
};

const ignoreNoTraditionCrash = () => {
  // Thrown at traditionList.js:52 and :136 when no tradition is selected
  cy.on(
    'uncaught:exception',
    (err) =>
      !/Cannot read properties of undefined \(reading '(name|id)'\)/.test(
        err.message
      )
  );
};

const currentUser = () => cy.request(`${middleware()}/user`).its('body.user');

describe('Sign in with GitHub', () => {
  beforeEach(() => {
    ignoreNoTraditionCrash();
    cy.reseedDB();
    chooseGithubAccount(account);
    cy.visitHome();
  });

  after(() => {
    cy.request('DELETE', `${mock}/__test/identity`);
  });

  it('registers a new GitHub user and signs them in, using their primary email', () => {
    clickGithubButton();
    cy.location('origin').should('eq', middleware());
    currentUser().should((user) => {
      expect(user.id).to.equal(account.login);
      expect(user.email).to.equal(account.email);
      expect(user.role).to.equal('user');
      expect(user.active).to.equal(true);
      expect(user).not.to.have.property('passphrase');
    });
  });

  it('signs a returning GitHub user in again without changing their account', () => {
    clickGithubButton();
    currentUser().its('id').should('eq', account.login);
    cy.request(`${middleware()}/logout`);
    currentUser().should('be.null');

    // The second time round the mock offers another address; the stored user is kept
    chooseGithubAccount({ login: account.login, email: 'changed@example.org' });
    cy.visitHome();
    clickGithubButton();
    currentUser().should((user) => {
      expect(user.id).to.equal(account.login);
      expect(user.email).to.equal(account.email);
    });
  });

  it('does not sign anyone in when the code exchange fails', () => {
    // A code the mock never issued, as if the user had tampered with the callback
    cy.visit(
      `${middleware()}/oauthcallback-github?code=not-a-real-code&state=x`
    );
    currentUser().should('be.null');
  });
});
