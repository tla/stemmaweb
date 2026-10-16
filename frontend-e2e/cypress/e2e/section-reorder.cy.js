// Reordering sections by dragging them in the sidebar list (SortableJS).
// Drag events are simulated by hand; see support/sections.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';

const owner = users.find(({ username }) => username === 'user@example.org');
const otherUser = users.find(({ username }) => username === 'benutzer@example.org');
const FLORILEGIUM = traditions.find(({ title }) => title.startsWith('Florilegium'));
const [W1, W2, X1, X2] = FLORILEGIUM.sections.map(({ name }) => name);
const ORIGINAL = [W1, W2, X1, X2];

const storedNames = () =>
  cy.storedSections(FLORILEGIUM.title).then(({ sections }) => sections.map((s) => s.name));
const idOf = (name) =>
  cy.storedSections(FLORILEGIUM.title).then(({ sections }) => sections.find((s) => s.name === name).id);

describe('Reorder sections by dragging', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => {
    cy.reseedDB();
    cy.intercept('PUT', '**/orderAfter/*').as('move');
  });

  const openFlorilegium = (user = owner) => {
    cy.visitAs(user);
    cy.selectTradition(FLORILEGIUM.title);
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, ORIGINAL);
  };

  [
    { what: 'up, into the middle', from: X2, to: W2, edge: 'before', order: [W1, X2, W2, X1], after: () => idOf(W1) },
    { what: 'to the top', from: X1, to: W1, edge: 'before', order: [X1, W1, W2, X2], after: () => cy.wrap('none') },
    { what: 'down, to the end', from: W1, to: X2, edge: 'after', order: [W2, X1, X2, W1], after: () => idOf(X2) }
  ].forEach(({ what, from, to, edge, order, after }) => {
    it(`moves "${from}" ${what}, and the order survives a reload`, () => {
      openFlorilegium();
      // the section it must be placed after, as the server is told
      after().then((priorId) => {
        cy.dragSection(FLORILEGIUM.title, from, to, edge);
        cy.wait('@move').its('request.url').should('match', new RegExp(`/section/\\d+/orderAfter/${priorId}$`));
      });
      cy.sectionNamesShouldEqual(FLORILEGIUM.title, order);
      storedNames().should('deep.equal', order);

      cy.reload();
      cy.appReady();
      cy.selectTradition(FLORILEGIUM.title);
      cy.sectionNamesShouldEqual(FLORILEGIUM.title, order);
    });
  });

  it('highlights the dragged section while it is dragged and not afterwards', () => {
    openFlorilegium();
    cy.startDraggingSection(FLORILEGIUM.title, X2);
    cy.get('@dragged').should('have.class', 'dragging-highlight');
    cy.dragOverSection(FLORILEGIUM.title, W2, 'before');
    cy.get('@dragged').should('have.class', 'dragging-highlight');
    cy.get('@dragged').then(($dragged) => cy.dropSection($dragged));
    cy.get('@dragged').should('not.have.class', 'dragging-highlight');
  });

  it('changes nothing when a drag is abandoned without moving', () => {
    cy.intercept('PUT', '**/orderAfter/*', cy.spy().as('moveSpy'));
    openFlorilegium();
    cy.startDraggingSection(FLORILEGIUM.title, X2);
    cy.get('@dragged').then(($dragged) => cy.dropSection($dragged));
    cy.get('@dragged').should('not.have.class', 'dragging-highlight');
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, ORIGINAL);
    cy.get('@moveSpy').should('not.have.been.called');
    storedNames().should('deep.equal', ORIGINAL);
  });

  // Required by the original spec for reordering (PR #128), but not what happens: SortableJS
  // leaves the section where it was last hovered and the move is sent to the server.
  // (SortableJS has a `revertOnSpill` option for this.)
  it.skip('puts the section back and sends nothing when it is released outside the list (known gap)', () => {
    cy.intercept('PUT', '**/orderAfter/*', cy.spy().as('moveSpy'));
    openFlorilegium();
    cy.startDraggingSection(FLORILEGIUM.title, X2);
    cy.dragOverSection(FLORILEGIUM.title, W2, 'before');
    // released over something that is not the list: no drop on the list, just the end of the drag
    cy.get('@dataTransfer').then((dataTransfer) => {
      cy.get('@dragged').trigger('dragend', { dataTransfer, force: true });
    });
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, ORIGINAL);
    cy.get('@moveSpy').should('not.have.been.called');
    storedNames().should('deep.equal', ORIGINAL);
  });

  it('restores the original order and says so when the server rejects the move', () => {
    cy.intercept('PUT', '**/orderAfter/*', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('moveFails');
    openFlorilegium();
    cy.dragSection(FLORILEGIUM.title, X2, W2, 'before');
    cy.wait('@moveFails');
    cy.contains('stemmaweb-alert', 'The original order has been restored');
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, ORIGINAL);
    storedNames().should('deep.equal', ORIGINAL);
  });

  it("does not let someone who doesn't own the tradition reorder its sections", () => {
    cy.intercept('PUT', '**/orderAfter/*', cy.spy().as('moveSpy'));
    // make the tradition public so that another user can see it
    cy.login(owner);
    cy.storedSections(FLORILEGIUM.title).then(({ tradId }) => {
      cy.request('PUT', `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api/tradition/${tradId}`, {
        id: tradId,
        name: FLORILEGIUM.title,
        owner: owner.username,
        language: FLORILEGIUM.language,
        direction: 'LR',
        is_public: true
      });
    });
    openFlorilegium(otherUser);
    cy.dragSection(FLORILEGIUM.title, X2, W2, 'before', { armed: false });
    cy.get('@dragged').should('not.have.class', 'sortable-chosen');
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, ORIGINAL);
    cy.get('@moveSpy').should('not.have.been.called');
    storedNames().should('deep.equal', ORIGINAL);
  });
});
