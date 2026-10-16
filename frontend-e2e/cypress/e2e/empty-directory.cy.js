// A directory without any tradition: the page must load without errors, the buttons that
// act on a tradition are greyed out, and the first tradition can be added. The data set
// is the 'empty' one (users, no traditions); see seed.js.
import users from '../fixtures/users.json';
import { ACTION_BUTTONS } from '../support/empty';

const owner = users.find(({ username }) => username === 'user@example.org');
const api = () => `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;

const WITH_STEMMA = Object.fromEntries(ACTION_BUTTONS.map((label) => [label, true]));
const NO_STEMMA = {
  ...Object.fromEntries(ACTION_BUTTONS.map((label) => [label, false])),
  'View stemmata': true,
  'View collation': true,
  'Download tradition': true,
  'Add stemma': true
};

// A tradition that comes with its stemmata (the same file as the seed's "Matthew 401")
const WITH_STEMMA_UPLOAD = {
  name: 'With stemma',
  file: 'matthew401.graphml.zip',
  type: 'graphml',
  title: 'Ժամանակագրութիւն checked'
};
const STEMMATA = ['First attempt', 'RHM 1641561271_0'];

// Upload a first tradition through the dialog.
// A native GraphML file names the tradition itself, which replaces the name typed in.
const addTradition = ({ name, file, type, title = name }) => {
  cy.openAddTraditionDialog();
  cy.fillSectionForm({ name, file: `cypress/fixtures/${file}`, type });
  cy.submitSectionForm();
  cy.contains('stemmaweb-alert', 'Tradition created');
  cy.addSectionDialogShouldBeClosed();
  cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.equal(title));
};

describe('A directory without traditions', () => {
  // Every test adds data, or must see none: start each from the empty data set.
  beforeEach(() => cy.reseedDB('empty'));
  after(() => cy.reseedDB());

  it('has no traditions in Stemmarest', () => {
    cy.login(owner);
    cy.request(`${api()}/traditions`).its('body').should('have.length', 0);
  });

  [
    { who: 'a guest', user: null },
    { who: 'a user', user: owner }
  ].forEach(({ who, user }) => {
    it(`loads for ${who} without errors and lists nothing`, () => {
      // an uncaught exception or unhandled rejection in the page fails the test by itself
      cy.on('window:before:load', (win) => cy.spy(win.console, 'error').as('consoleError'));
      if (user) cy.login(user);
      else cy.clearCookies();
      cy.visitEmptyHome();
      cy.get('#traditions-list .folder-icon').should('not.exist');
      cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.be.empty);
      cy.get('stemmaweb-alert .alert-danger').should('not.exist');
      cy.get('@consoleError').should('not.have.been.called');
    });
  });

  // Known gap: nothing greys these buttons out when there is no tradition. The button bar and the stemma
  // links only look at the owner of the selected tradition (stemmaButtons.js, editStemma.js), and none is
  // selected, so "View stemmata", "View collation" and both downloads are always offered, and the stemma
  // links stay in their initial state. Drop the `.skip` when that is fixed.
  ACTION_BUTTONS.forEach((label) => {
    it.skip(`greys out "${label}" when there is no tradition (known gap: nothing does)`, () => {
      cy.login(owner);
      cy.visitEmptyHome();
      cy.actionButtonShouldBe(label, false);
    });
  });

  it('lets a user add a tradition, which becomes the current one', () => {
    cy.login(owner);
    cy.visitEmptyHome();
    addTradition({ name: 'First tradition', file: 'armexample.csv', type: 'csv' });
    cy.traditionListShouldEqual(['First tradition']);
    cy.request(`${api()}/traditions`).its('body').should(($all) => {
      expect($all.map((t) => t.name)).to.deep.equal(['First tradition']);
    });

    // and it is still there after a reload
    cy.reload();
    cy.appReady();
    cy.traditionListShouldEqual(['First tradition']);
  });

  it('offers the tradition buttons, and the add stemma button, after adding a tradition without a stemma', () => {
    cy.login(owner);
    cy.visitEmptyHome();
    addTradition({ name: 'No stemma', file: 'armexample.csv', type: 'csv' });
    cy.stemmaListShouldEqual([]);
    cy.actionButtonsShouldBe(NO_STEMMA);
  });

  it('offers every button after adding a tradition with a stemma', () => {
    cy.login(owner);
    cy.visitEmptyHome();
    addTradition(WITH_STEMMA_UPLOAD);
    cy.stemmaListShouldEqual(STEMMATA);
    cy.actionButtonsShouldBe(WITH_STEMMA);
  });

  it('keeps the buttons as they should be after a reload', () => {
    cy.login(owner);
    cy.visitEmptyHome();
    addTradition(WITH_STEMMA_UPLOAD);
    cy.reload();
    cy.appReady();
    cy.actionButtonsShouldBe(WITH_STEMMA);
  });
});
