// Commands for the section list and the "add a section" dialog.

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The sidebar entry of a tradition, matched on its exact title ("Verbum" must not match
// "Verbum uncorrected").
const traditionItem = (title) =>
  cy
    .contains('#traditions-list span.tradition-nav-name', new RegExp(`^${escapeRegExp(title)}$`))
    .closest('.nav-item');

// Select a section in the sidebar (the tradition must already be selected, so that its
// sections are listed) and wait for the section properties to show it.
Cypress.Commands.add('selectSection', (traditionTitle, sectionName) => {
  traditionItem(traditionTitle)
    .contains('section-list .section-name', new RegExp(`^${escapeRegExp(sectionName)}$`))
    .click();
  cy.sectionPropertyShouldBe('Name', sectionName);
});

// A row of the section properties table ("Section" (id), "Name" or "Language").
// Only the visible table counts: the page holds a second, hidden section-properties-view
// (in the collation view) with the same ids, which keeps stale content.
Cypress.Commands.add('sectionPropertyShouldBe', (label, value) => {
  cy.contains('#section-info:visible td.section-property-label-cell', new RegExp(`^${label}$`))
    .siblings('td')
    .should(($cell) => expect($cell.text().trim()).to.equal(value));
});

Cypress.Commands.add('editSectionShouldBe', (enabled) => {
  cy.get('edit-section-properties-button a').should(
    enabled ? 'not.have.class' : 'have.class',
    'greyed-out'
  );
});

Cypress.Commands.add('deleteSectionShouldBe', (enabled) => {
  cy.get('delete-section-button a').should(
    enabled ? 'not.have.class' : 'have.class',
    'greyed-out'
  );
});

// Open the "Edit section properties" dialog and wait for it to settle.
Cypress.Commands.add('openEditSectionProperties', () => {
  cy.get('edit-section-properties-button a').click();
  cy.get('#modalDialog').should('be.visible');
  cy.focused().should('have.id', 'modalDialog');
  cy.get('#modalDialogLabel').should('have.text', 'Edit section properties');
});

// The section names listed under a tradition in the sidebar, in order.
Cypress.Commands.add('sectionNamesShouldEqual', (traditionTitle, names) => {
  traditionItem(traditionTitle)
    .find('section-list ul')
    .should(($list) => {
      const actual = [...$list.find('li .section-name')].map((el) => el.textContent.trim());
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

// Click the delete button of the selected section, wait for the confirmation dialog.
Cypress.Commands.add('openDeleteSection', () => {
  cy.get('delete-section-button a').click();
  cy.get('#modalDialog').should('be.visible');
  cy.focused().should('have.id', 'modalDialog');
  cy.get('#modalDialogLabel').should('have.text', 'Delete Section');
});

const sectionItem = (traditionTitle, sectionName) =>
  traditionItem(traditionTitle)
    .contains('section-list .section-name', new RegExp(`^${escapeRegExp(sectionName)}$`))
    .closest('li');

// The pieces of a drag, so that tests can stop part-way (a drag that is abandoned).
// SortableJS uses native drag-and-drop events, which Cypress does not generate itself, so
// they are dispatched by hand: pointerdown (SortableJS arms the item), then dragstart,
// dragover and drop with a DataTransfer, and finally dragend.
const dragEventPoint = ($target, edge) => {
  const rect = $target[0].getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: edge === 'after' ? rect.bottom - 2 : rect.top + 2
  };
};

// Start dragging `sectionName`, leaving the drag in progress. SortableJS finishes starting
// a drag on the next timer tick (it then marks the item `sortable-ghost`); events sent
// before that are ignored, so wait for the mark. Pass `armed: false` when the drag is
// expected to be refused (a disabled list), in which case there is no mark to wait for.
Cypress.Commands.add('startDraggingSection', (traditionTitle, sectionName, { armed = true } = {}) => {
  const dataTransfer = new DataTransfer();
  cy.wrap(dataTransfer, { log: false }).as('dataTransfer');
  sectionItem(traditionTitle, sectionName)
    .as('dragged')
    .trigger('pointerdown', { button: 0, force: true })
    .trigger('mousedown', { button: 0, force: true })
    .trigger('dragstart', { dataTransfer, force: true });
  if (armed) cy.get('@dragged').should('have.class', 'sortable-ghost');
});

// While dragging, hover over another section: `edge` is 'before' (top half) or 'after'.
Cypress.Commands.add('dragOverSection', (traditionTitle, sectionName, edge) => {
  cy.get('@dataTransfer').then((dataTransfer) => {
    sectionItem(traditionTitle, sectionName).then(($target) => {
      const point = dragEventPoint($target, edge);
      cy.wrap($target)
        .trigger('dragenter', { dataTransfer, ...point, force: true })
        .trigger('dragover', { dataTransfer, ...point, force: true });
    });
  });
});

// Let go over the section just hovered (or anywhere else) and end the drag.
Cypress.Commands.add('dropSection', (dropTarget) => {
  cy.get('@dataTransfer').then((dataTransfer) => {
    cy.wrap(dropTarget, { log: false }).trigger('drop', { dataTransfer, force: true });
    cy.get('@dragged').trigger('dragend', { dataTransfer, force: true });
  });
});

// Drag one section next to another and drop it there.
Cypress.Commands.add('dragSection', (traditionTitle, from, to, edge, options) => {
  cy.startDraggingSection(traditionTitle, from, options);
  cy.dragOverSection(traditionTitle, to, edge);
  sectionItem(traditionTitle, to).then(($target) => cy.dropSection($target));
});
