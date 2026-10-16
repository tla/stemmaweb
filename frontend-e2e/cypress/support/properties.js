// Commands for the tradition properties table and the "Edit properties" dialog.

const LABEL_CELL = 'td.tradition-property-label-cell';

// A row of the properties table, by its label ("Access", "Language", ...).
Cypress.Commands.add('propertyShouldBe', (label, value) => {
  cy.contains(`#tradition_info ${LABEL_CELL}`, new RegExp(`^${label}$`))
    .siblings('td')
    .should(($cell) => expect($cell.text().trim()).to.equal(value));
});

// Open the dialog and wait for it to settle. Bootstrap moves focus to the modal
// container when its fade-in ends; typing before that loses keystrokes.
Cypress.Commands.add('openEditProperties', () => {
  cy.get('property-table-view edit-properties-button').click();
  cy.get('#modalDialog').should('be.visible');
  cy.focused().should('have.id', 'modalDialog');
  cy.get('#modalDialogLabel').should('have.text', 'Edit properties');
});

// Fill in any of: name, language, direction ('LR' | 'RL' | 'BI'), isPublic, owner (user id).
Cypress.Commands.add('fillProperties', (values) => {
  const { name, language, direction, isPublic, owner } = values;
  if (name !== undefined) {
    cy.get('#name_input').clear();
    if (name) cy.get('#name_input').type(name);
  }
  if (language !== undefined) {
    cy.get('#language_input').clear();
    if (language) cy.get('#language_input').type(language);
  }
  if (direction) cy.get('#direction_input').select(direction);
  if (isPublic !== undefined) {
    cy.get('#access_input')[isPublic ? 'check' : 'uncheck']();
  }
  if (owner) cy.get('#owner_input').select(owner);
});

Cypress.Commands.add('clickDialogButton', (label) => {
  cy.contains('#modalDialog .modal-footer button', label).click();
});

// The dialog has fully closed (hidden, and its backdrop gone so clicks reach the page).
Cypress.Commands.add('dialogShouldBeClosed', () => {
  cy.get('#modalDialog').should('not.be.visible');
  cy.get('.modal-backdrop').should('not.exist');
});
