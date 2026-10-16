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
  else cy.clearCookies(); // a guest, even if the test was logged in earlier
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
// everything else should use `cy.login`.
Cypress.Commands.add('loginViaForm', (user) => {
  cy.openLoginModal();
  cy.get('#loginEmail').type(user.username);
  cy.get('#loginPassword').type(user.password);
  cy.get('#loginEmail').should('have.value', user.username);
  cy.get('button').contains('Sign in').click();
  cy.get('#authModal').should('not.be.visible');
  cy.contains('header a', `Logged in as ${user.username}`);
});

// Switch the open sign-in modal to the registration form ("Register" link) and wait for it.
Cypress.Commands.add('showRegisterForm', () => {
  cy.contains('#authModal a', 'Register').click();
  cy.get('#registerEmail').should('be.visible');
});

// Fill in the registration form; `confirm` defaults to the password.
Cypress.Commands.add('fillRegisterForm', ({ email, password, confirm = password }) => {
  if (email) cy.get('#registerEmail').type(email);
  if (password) cy.get('#registerPassword').type(password);
  if (confirm) cy.get('#registerConfirmPassword').type(confirm);
});

Cypress.Commands.add('submitRegisterForm', () => {
  cy.contains('#authModal button', /Sign (u|U)p/).click();
});

// Sign out through the header link and wait for the signed-out header.
Cypress.Commands.add('signOut', () => {
  cy.contains('header a', 'Sign out').click();
  cy.contains('header a', 'Sign in');
  cy.get('header').should('not.contain', 'Sign out');
});

// Click "Delete" for the selected tradition and wait for the confirmation dialog.
Cypress.Commands.add('openDeleteTradition', () => {
  cy.get('#delete-tradition-button').click();
  cy.get('#modalDialog').should('be.visible');
  cy.focused().should('have.id', 'modalDialog');
  cy.get('#modalDialogLabel').should('have.text', 'Delete Tradition');
});

// Exactly one tradition is highlighted in the list, and it is the one shown as the current tradition.
Cypress.Commands.add('currentTraditionShouldBeHighlighted', () => {
  cy.get('#traditions-list .folder-icon.selected').should('have.length', 1);
  cy.get('#tradition-name').invoke('text').then((shown) => {
    cy.get('#traditions-list .folder-icon.selected')
      .closest('li')
      .find('span.tradition-nav-name')
      .should(($name) => expect($name.text().trim()).to.equal(shown.trim()));
  });
});
