import { SEPARATOR } from './expectations';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const homeUrl = () => `${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`;

// Wait until the app has finished starting up: the current-user check (`GET /user`,
// aliased `currentUser` by `visitHome`) has returned, the tradition list is rendered
// and the first tradition has been auto-selected. Interacting earlier is flaky; for
// example, text typed into the login form is cut off when start-up steals focus.
Cypress.Commands.add('appReady', () => {
  cy.wait('@currentUser');
  cy.get('#traditions-list .folder-icon').should('exist');
  cy.get('#tradition-name').should(($name) =>
    expect($name.text().trim()).not.to.be.empty
  );
});

// Visit the home page and wait for the app to be ready. After a `cy.reload()`, call
// `cy.appReady()` instead.
Cypress.Commands.add('visitHome', () => {
  cy.intercept('GET', '**/user').as('currentUser');
  cy.visit(homeUrl());
  cy.appReady();
});

// Visit the home page as `user` (null for a guest).
Cypress.Commands.add('visitAs', (user) => {
  if (user) cy.login(user);
  cy.visitHome();
});

// Click a tradition in the list (exact title match) and wait until it is shown.
Cypress.Commands.add('selectTradition', (title) => {
  cy.contains(
    '#traditions-list span.tradition-nav-name',
    new RegExp(`^${escapeRegExp(title)}$`)
  ).click();
  cy.get('#tradition-name').should(($name) =>
    expect($name.text().trim()).to.equal(title)
  );
});

// The tradition list as an ordered array of titles, with SEPARATOR marking the divider.
Cypress.Commands.add('traditionListShouldEqual', (expected) => {
  cy.get('#traditions-list > li').should(($items) => {
    const actual = [...$items].map((li) =>
      li.querySelector('.list-separator')
        ? SEPARATOR
        : li.querySelector('span.tradition-nav-name')?.textContent.trim()
    );
    expect(actual).to.deep.equal(expected);
  });
});

// A button in the stemma button bar is either offered (visible, enabled) or
// disabled (greyed, no pointer events).
Cypress.Commands.add('stemmaButtonShouldBe', (label, enabled) => {
  cy.contains('stemma-buttons button', label).then(($button) => {
    cy.wrap($button).should('be.visible');
    if (enabled) {
      cy.wrap($button).should('not.have.class', 'disabled');
      cy.wrap($button).should('not.have.css', 'pointer-events', 'none');
      cy.wrap($button).should('be.enabled');
    } else {
      cy.wrap($button).should('have.class', 'disabled');
      cy.wrap($button).should('have.css', 'pointer-events', 'none');
    }
  });
});

Cypress.Commands.add('editPropertiesShouldBe', (enabled) => {
  cy.get('property-table-view edit-properties-button a').should(
    enabled ? 'not.have.class' : 'have.class',
    'greyed-out'
  );
});

// Open the sign-in modal and wait until it has settled. When its fade-in ends,
// Bootstrap moves focus to the modal container; keystrokes sent to a form field
// before that are cut off mid-word, so wait for the focus to land.
Cypress.Commands.add('openLoginModal', () => {
  cy.contains('header a', 'Sign in').click();
  cy.get('#authModal').should('be.visible');
  cy.focused().should('have.id', 'authModal');
});

// Sign in by filling in the login form. Use only when the form itself is under test;
// everything else should use `cy.login`. (The old `loginViaUi` stays for the legacy
// specs, which depend on its fixed waits.)
Cypress.Commands.add('loginViaForm', (user) => {
  cy.openLoginModal();
  cy.get('#loginEmail').type(user.username);
  cy.get('#loginPassword').type(user.password);
  cy.get('#loginEmail').should('have.value', user.username);
  cy.get('button').contains('Sign in').click();
  cy.get('#authModal').should('not.be.visible');
  cy.contains('header a', `Logged in as ${user.username}`);
});
