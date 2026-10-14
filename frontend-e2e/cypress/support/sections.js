// Commands for the section list and the "add a section" dialog.

// The section names listed under a tradition in the sidebar, in order.
Cypress.Commands.add('sectionNamesShouldEqual', (traditionTitle, names) => {
  cy.contains('#traditions-list .nav-item', traditionTitle)
    .find('section-list ul')
    .children()
    .should(($items) => {
      const actual = [...$items].map((li) => li.textContent.trim());
      expect(actual).to.deep.equal(names);
    });
});

// Open the upload dialog in "add a section to an existing tradition" mode and wait for
// it to settle (Bootstrap moves focus to the modal container at the end of the fade-in).
Cypress.Commands.add('openAddSectionDialog', () => {
  cy.contains('h6', 'Text directory')
    .find('svg.feather-plus-circle')
    .parents('a')
    .click();
  cy.get('#add_tradition_modal').should('be.visible');
  cy.focused().should('have.id', 'add_tradition_modal');
  cy.get('#button_new_section').click();
  cy.get('#new_section_partial').should('not.have.class', 'hide');
});

// Fill in the section form; `file` is a path relative to the Cypress project root.
Cypress.Commands.add('fillSectionForm', ({ name, file, type }) => {
  if (name) cy.get('#new_name').type(name);
  if (file) cy.get('#uploadfile').selectFile(file);
  if (type) cy.get('#new_filetype').select(type);
});

Cypress.Commands.add('submitSectionForm', () => {
  cy.get('#add_tradition_form button[type="submit"]').click();
});

Cypress.Commands.add('addSectionDialogShouldBeClosed', () => {
  cy.get('#add_tradition_modal').should('not.be.visible');
  cy.get('.modal-backdrop').should('not.exist');
});

// What Stemmarest holds for a tradition, read through the middleware with the
// logged-in session. Resolves with { tradId, sections: [{ id, name }] }.
Cypress.Commands.add('storedSections', (traditionTitle) => {
  const api = `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
  cy.request(`${api}/traditions`).then(({ body }) => {
    const { id: tradId } = body.find((t) => t.name === traditionTitle);
    cy.request(`${api}/tradition/${tradId}/sections`).then(({ body: sections }) => {
      cy.wrap({ tradId, sections }, { log: false });
    });
  });
});

// The text of one witness in one section, as Stemmarest reconstructs it.
Cypress.Commands.add('witnessText', (tradId, sectionId, sigil) => {
  const api = `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
  cy.request(
    `${api}/tradition/${tradId}/section/${sectionId}/witness/${sigil}/text`
  )
    .its('body.text')
    .then((text) => cy.wrap(text, { log: false }));
});
