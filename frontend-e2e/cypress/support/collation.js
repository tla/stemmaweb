// Commands for the collation view ("Edit Collation" / "View Collation").

// Everything Stemmarest holds for one section of a tradition, read through the middleware with
// the current session: { tradId, section, readings, relations, relationTypes }.
Cypress.Commands.add('storedCollation', (traditionTitle, sectionIndex = 0) => {
  const api = `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
  cy.request(`${api}/traditions`).then(({ body }) => {
    const { id: tradId } = body.find((t) => t.name === traditionTitle);
    cy.request(`${api}/tradition/${tradId}/sections`).then(({ body: sections }) => {
      const section = sections[sectionIndex];
      const base = `${api}/tradition/${tradId}`;
      cy.request(`${base}/section/${section.id}/readings`).then(({ body: readings }) => {
        cy.request(`${base}/section/${section.id}/relations`).then(({ body: relations }) => {
          cy.request(`${base}/relationtypes`).then(({ body: relationTypes }) => {
            cy.wrap({ tradId, section, readings, relations, relationTypes }, { log: false });
          });
        });
      });
    });
  });
});

// Open the collation view with the "Edit Collation" / "View Collation" button, and wait until
// it is usable: the graph is drawn, and the page has loaded the readings and relations (clicks
// on readings only do something once their handlers are attached after that).
Cypress.Commands.add('openCollation', () => {
  cy.intercept('GET', '**/section/*/readings').as('collationReadings');
  cy.intercept('GET', '**/section/*/relations').as('collationRelations');
  cy.get('#edit-collation-button').click();
  cy.get('relation-mapper').should('be.visible');
  cy.get('#relation-graph svg g.node').should('have.length.greaterThan', 0);
  cy.wait(['@collationReadings', '@collationRelations']);
});

// The graph shows exactly the stored readings and relations (drawn once the data has arrived).
// Graphviz adds one helper node titled "#SILENT#" for layout; every other node is titled with
// the id of a reading (the start and end nodes included).
Cypress.Commands.add('collationGraphShouldShow', ({ readings, relations }) => {
  cy.get('#relation-graph svg g.node').should(($nodes) => {
    const titles = [...$nodes].map((n) => n.querySelector('title').textContent.trim()).filter((t) => t !== '#SILENT#');
    expect(titles).to.have.members(readings.map((r) => String(r.id)));
  });
  cy.get('#relation-graph svg g.relation').should('have.length', relations.length);
});

Cypress.Commands.add('sectionTitleShouldBe', (name) => {
  cy.get('#section-title').should(($t) => expect($t.text().trim()).to.equal(name));
});

// Pick a section from the collation view's own dropdown.
Cypress.Commands.add('selectCollationSection', (name) => {
  cy.get('#section-selectors-menu-button').click();
  cy.contains('#section-selectors .section-selector', new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)).click();
  cy.wait(['@collationReadings', '@collationRelations']);
});

// Click a reading in the graph and wait for it to be selected. The page attaches its click
// handlers a moment after the readings have arrived, so a click right after opening the view
// can be ignored; click again until it takes.
Cypress.Commands.add('selectReading', (readingId, attempts = 8) => {
  const selector = `#n${readingId}`;
  cy.get(selector).click({ force: true });
  cy.get(selector).then(($node) => {
    if (!$node.hasClass('selected') && attempts > 1) {
      cy.wait(250);
      cy.selectReading(readingId, attempts - 1);
    }
  });
  if (attempts === 8) cy.get(selector).should('have.class', 'selected');
});
