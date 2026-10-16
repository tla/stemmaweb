// Commands for a directory without any tradition (see the 'empty' data set in seed.js).

// Visit the home page and wait for the app to have asked for the user and the traditions.
// `appReady` cannot be used: it waits for a first tradition to be selected.
Cypress.Commands.add('visitEmptyHome', () => {
  cy.intercept('GET', '**/user').as('currentUser');
  cy.intercept('GET', '**/api/traditions').as('traditions');
  cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
  cy.wait('@currentUser');
  cy.wait('@traditions');
});

// The buttons that act on a tradition or its stemma, as { label: selector }. All but the
// stemma links are in the button bar, and are greyed out with the `disabled` class.
const BAR_BUTTONS = {
  'View stemmata': '#view-stemmata-button',
  'View collation': '#edit-collation-button',
  'Download tradition': '#tradition-download-button',
  'Download stemma': '#stemma_image_downloadbtn'
};
const STEMMA_LINKS = {
  'Add stemma': '#add-stemma-button-link',
  'Edit stemma': '#edit-stemma-button-link',
  'Delete stemma': '#delete-stemma-button-link'
};

// One of the buttons above is offered (`enabled`) or greyed out.
Cypress.Commands.add('actionButtonShouldBe', (label, enabled) => {
  const selector = BAR_BUTTONS[label] ?? STEMMA_LINKS[label];
  const [greyed, noMouse] = label in BAR_BUTTONS ? ['disabled', true] : ['greyed-out', false];
  cy.get(selector).should(enabled ? 'not.have.class' : 'have.class', greyed);
  if (!enabled && noMouse) cy.get(selector).should('have.css', 'pointer-events', 'none');
});

// `expected` maps each label above to whether the button is offered (true) or greyed out.
Cypress.Commands.add('actionButtonsShouldBe', (expected) => {
  Object.entries(expected).forEach(([label, enabled]) => {
    cy.actionButtonShouldBe(label, enabled);
  });
});

export const ACTION_BUTTONS = [...Object.keys(BAR_BUTTONS), ...Object.keys(STEMMA_LINKS)];

// What a directory without any tradition looks like: nothing listed, no title, the properties table
// with its heading but no rows, and every button that acts on a tradition or stemma greyed out.
Cypress.Commands.add('emptyDirectoryShouldShow', () => {
  cy.get('#traditions-list .folder-icon').should('not.exist');
  cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.be.empty);
  cy.get('property-table-view').contains('Tradition Properties').should('be.visible');
  cy.get('#tradition_info tr').should('not.exist');
  cy.editPropertiesShouldBe(false);
  cy.actionButtonsShouldBe(Object.fromEntries(ACTION_BUTTONS.map((label) => [label, false])));
});
