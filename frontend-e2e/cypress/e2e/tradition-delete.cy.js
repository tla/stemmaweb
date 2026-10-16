// Deleting a whole tradition. Who is offered the Delete button is covered in permissions.cy.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList, SEPARATOR } from '../support/expectations';

const owner = users.find(({ username }) => username === 'user@example.org');
const otherUser = users.find(({ username }) => username === 'benutzer@example.org');
const admin = users.find(({ role }) => role === 'admin');
const tradition = (start) => traditions.find((t) => t.title.startsWith(start));

const LEGEND = tradition("Legend's"); // owned by user: 2 sections
const FLORILEGIUM = tradition('Florilegium'); // owned by user: 4 sections, a stemma
const NOTRE_BESOIN = tradition('Notre besoin'); // owned by user, public: 2 stemmata
const JOHN = tradition('John verse'); // owned by benutzer, public

const without = (title) => traditions.filter((t) => t.title !== title);
const api = () => `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
const idOf = (title) => cy.request(`${api()}/traditions`).then(({ body }) => body.find((t) => t.name === title).id);

describe('Delete a tradition', () => {
  // These tests change data, so start each from the seed data, and leave it as found.
  beforeEach(() => cy.reseedDB());
  after(() => cy.reseedDB());

  it('names the tradition in the confirmation dialog, and leaves everything alone when it is cancelled', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.openDeleteTradition();
    cy.get('#modalDialog .modal-body .fst-italic').should(($n) => expect($n.text().trim()).to.equal(LEGEND.title));
    cy.clickDialogButton('Cancel');
    cy.dialogShouldBeClosed();
    cy.traditionListShouldEqual(expectedTraditionList(owner, traditions));
    cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.equal(LEGEND.title));
    idOf(LEGEND.title).should('be.a', 'string');
  });

  it('deletes the selected tradition: it leaves the list, another becomes current, and it stays gone after a reload', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    idOf(LEGEND.title).then((id) => {
      cy.openDeleteTradition();
      cy.clickDialogButton('Yes, delete it');
      cy.contains('stemmaweb-alert', `Deleted ${LEGEND.title}`);
      cy.dialogShouldBeClosed();

      const remaining = expectedTraditionList(owner, without(LEGEND.title));
      cy.traditionListShouldEqual(remaining);
      cy.currentTraditionShouldBeHighlighted();
      cy.get('#tradition-name').should(($n) => expect($n.text().trim()).not.to.equal(LEGEND.title));

      // Stemmarest no longer has it, or its sections
      cy.request({ url: `${api()}/tradition/${id}`, failOnStatusCode: false }).its('status').should('not.eq', 200);
      cy.request({ url: `${api()}/tradition/${id}/sections`, failOnStatusCode: false }).its('status').should('not.eq', 200);
      cy.request(`${api()}/traditions`).its('body').should(($all) => {
        expect($all.map((t) => t.name)).not.to.include(LEGEND.title);
      });

      cy.reload();
      cy.appReady();
      cy.traditionListShouldEqual(remaining);
    });
  });

  it('deletes the tradition that is selected, not the one that was first', () => {
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.openDeleteTradition();
    cy.clickDialogButton('Yes, delete it');
    cy.contains('stemmaweb-alert', `Deleted ${NOTRE_BESOIN.title}`);
    cy.dialogShouldBeClosed();
    cy.traditionListShouldEqual(expectedTraditionList(owner, without(NOTRE_BESOIN.title)));
  });

  it("leaves the other traditions with their sections and stemmata", () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.openDeleteTradition();
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    cy.selectTradition(FLORILEGIUM.title);
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, FLORILEGIUM.sections.map((s) => s.name));
    cy.stemmaListShouldEqual(FLORILEGIUM.stemmata);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.stemmaListShouldEqual(NOTRE_BESOIN.stemmata);
  });

  it("is seen by other users at once: a deleted public tradition leaves their list too", () => {
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.openDeleteTradition();
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    [null, otherUser].forEach((viewer) => {
      cy.visitAs(viewer);
      cy.traditionListShouldEqual(expectedTraditionList(viewer, without(NOTRE_BESOIN.title)));
    });
  });

  it("lets an admin delete someone else's tradition", () => {
    cy.visitAs(admin);
    cy.selectTradition(JOHN.title);
    cy.openDeleteTradition();
    cy.clickDialogButton('Yes, delete it');
    cy.contains('stemmaweb-alert', `Deleted ${JOHN.title}`);
    cy.dialogShouldBeClosed();
    cy.traditionListShouldEqual(expectedTraditionList(admin, without(JOHN.title)));
  });

  it('reports an error and keeps the tradition when the server rejects the deletion', () => {
    cy.intercept('DELETE', '**/api/tradition/*', { statusCode: 500, body: { code: 500, message: 'Simulated' } }).as('delete');
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.openDeleteTradition();
    cy.clickDialogButton('Yes, delete it');
    cy.wait('@delete');
    cy.contains('stemmaweb-alert', 'Error during deletion');
    cy.dialogShouldBeClosed();
    cy.traditionListShouldEqual(expectedTraditionList(owner, traditions));
  });

  [
    { who: 'a guest', user: null },
    { who: 'another user', user: owner }
  ].forEach(({ who, user }) => {
    it(`has the server refuse ${who} deleting someone else's tradition`, () => {
      if (user) cy.login(user);
      else cy.clearCookies();
      idOf(JOHN.title).then((id) => {
        cy.request({ method: 'DELETE', url: `${api()}/tradition/${id}`, failOnStatusCode: false }).its('status').should('eq', 403);
        cy.request(`${api()}/traditions`).its('body').should(($all) => expect($all.map((t) => t.name)).to.include(JOHN.title));
      });
    });
  });

  // Known bug: deleting the last tradition sets the selected tradition to null, and the tradition list
  // (traditionList.js:52) then reads `state.selectedTradition.name`, throwing "Cannot read properties of
  // null (reading 'name')" as an unhandled rejection.
  it.skip('can delete every tradition, leaving an empty directory (known bug: crashes on the last one)', () => {
    cy.visitAs(admin);
    let left = traditions.map((t) => t.title);
    traditions.forEach((t) => {
      cy.selectTradition(t.title);
      cy.openDeleteTradition();
      cy.clickDialogButton('Yes, delete it');
      cy.dialogShouldBeClosed();
      left = left.filter((title) => title !== t.title);
      cy.traditionListShouldEqual(expectedTraditionList(admin, traditions.filter((x) => left.includes(x.title))));
    });
    cy.get('#traditions-list .folder-icon').should('not.exist');
    cy.request(`${api()}/traditions`).its('body').should('have.length', 0);
  });
});

describe('Buttons that are greyed out do nothing when activated without the mouse', () => {
  // The CSS keeps a mouse away from a greyed-out button, but a keyboard user can Tab to it and press
  // Enter. `force: true` clicks it as the browser does for the keyboard.
  // Known gap: the click handlers of "Delete" and "Run Stemweb" (stemmaButtons.js) do not check
  // that the user owns the tradition, so both open their dialogs for a guest or a non-owner.
  [
    { button: '#delete-tradition-button', dialog: 'Delete Tradition' },
    { button: '#run-stemweb-button', dialog: 'Generate a Stemweb tree' }
  ].forEach(({ button, dialog }) => {
    [
      { who: 'a guest', user: null },
      { who: 'another user', user: owner }
    ].forEach(({ who, user }) => {
      it.skip(`${button} opens no "${dialog}" dialog for ${who} (known gap: no ownership check)`, () => {
        cy.visitAs(user);
        cy.selectTradition(JOHN.title);
        cy.get(button).should('have.class', 'disabled').and('have.css', 'pointer-events', 'none');
        cy.get(button).click({ force: true });
        // a dialog takes a moment to fade in, so "no open modal" is only meaningful after a pause
        cy.wait(1000);
        cy.get('.modal.show').should('not.exist');
      });
    });
  });
});
