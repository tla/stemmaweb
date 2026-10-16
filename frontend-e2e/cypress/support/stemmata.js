// Commands for the stemma selector, the stemma graph and the stemma editor.

const text = (el) => el.textContent.trim();

// The stemma dropdown: a "Select stemma" button and one entry per stemma. A tradition
// without stemmata has neither. The order of the entries is not meaningful, so the names
// are compared as a set; use `listedStemmata` where the position matters.
Cypress.Commands.add('stemmaListShouldEqual', (names) => {
  if (names.length === 0) {
    cy.get('#stemma-selectors-menu-button').should('not.exist');
    cy.get('#stemma-selectors .stemma-selector').should('not.exist');
    cy.get('#stemma-name').should('be.empty');
    return;
  }
  cy.get('#stemma-selectors-menu-button').should('have.text', 'Select stemma');
  cy.get('#stemma-selectors .stemma-selector').should(($items) => {
    expect([...$items].map(text)).to.have.members(names);
  });
});

// The stemma names in the dropdown, in the order they are listed.
Cypress.Commands.add('listedStemmata', () => {
  cy.get('#stemma-selectors .stemma-selector').then(($items) => [...$items].map(text));
});

// Exactly one stemma is marked selected in the dropdown, and its name is shown beside it.
Cypress.Commands.add('selectedStemmaShouldBe', (name) => {
  cy.get('#stemma-name').should(($n) => expect(text($n[0])).to.equal(name));
  cy.get('#stemma-selectors .stemma-selector.selected').should(($s) => {
    expect([...$s].map(text)).to.deep.equal([name]);
  });
});

// The name of the stemma selected now, once it has been drawn into the page.
Cypress.Commands.add('selectedStemmaName', () => {
  cy.get('#stemma-name').should(($n) => expect(text($n[0])).not.to.be.empty);
  cy.get('#stemma-name').then(($n) => text($n[0]));
});

Cypress.Commands.add('selectStemma', (name) => {
  cy.get('#stemma-selectors-menu-button').click();
  // exact match: "Stemweb stemma" is a prefix of "Stemweb stemma duplicate"
  cy.contains('#stemma-selectors .stemma-selector', new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)).click();
  cy.selectedStemmaShouldBe(name);
});

// The stemma graph is drawn (an SVG with the stemma's nodes), or there is none.
Cypress.Commands.add('stemmaGraphShouldBe', (drawn) => {
  if (drawn) {
    cy.get('#graph-area #graph svg').should('be.visible').and('have.length', 1);
  } else {
    cy.get('#graph-area #graph svg').should('not.exist');
  }
});

// The node labels of the drawn graph (Graphviz titles each node with its id).
Cypress.Commands.add('stemmaNodes', () => {
  cy.get('#graph svg g.node title').then(($titles) => [...$titles].map(text).sort());
});

// Which of the add / edit / delete links are offered (the others are greyed out).
Cypress.Commands.add('stemmaLinksShouldBe', ({ add, edit, del }) => {
  Object.entries({ add, edit, delete: del }).forEach(([which, enabled]) => {
    cy.get(`#${which}-stemma-button-link`).should(
      enabled ? 'not.have.class' : 'have.class',
      'greyed-out'
    );
  });
});

// What Stemmarest holds: [{ stemmaid, name, dot, ... }] for a tradition, in order.
Cypress.Commands.add('storedStemmata', (traditionTitle) => {
  const api = `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
  cy.request(`${api}/traditions`).then(({ body }) => {
    const { id } = body.find((t) => t.name === traditionTitle);
    cy.request(`${api}/tradition/${id}/stemmata`).then(({ body: stemmata }) => {
      cy.wrap(stemmata, { log: false });
    });
  });
});

// Open the stemma editor with the "edit" or "add" link and wait until it is ready:
// expanded, its buttons drawn and (for add) the example stemma written into it.
Cypress.Commands.add('openStemmaEditor', (action) => {
  cy.get(`#${action}-stemma-button-link`).click();
  cy.get('#stemma-editor-container').should('have.class', 'expanded');
  cy.get('#save-stemma-button-link').should('exist');
  cy.get('#stemma-dot-editor').should(($t) => expect($t.val().trim()).not.to.be.empty);
});

// Replace the editor's text, as a paste would. (Typing it would not do: the text area
// auto-indents each new line like the previous one, so multi-line text arrives as a
// staircase, and Stemmarest rejects dot whose closing brace is indented by spaces.)
// The graph preview updates on keyup.
Cypress.Commands.add('setStemmaDot', (dot) => {
  cy.get('#stemma-dot-editor').invoke('val', dot).trigger('keyup');
});

Cypress.Commands.add('stemmaEditorShouldBeClosed', () => {
  cy.get('#stemma-editor-container').should('not.have.class', 'expanded');
  cy.get('#stemma-editor-graph-container-modal-backdrop').should('not.exist');
  cy.get('#save-stemma-button-link').should('not.exist');
});

Cypress.Commands.add('saveStemma', () => {
  cy.get('#save-stemma-button-link').click();
});

Cypress.Commands.add('cancelStemmaEditor', () => {
  cy.get('#cancel-edit-stemma-button-link').click();
});

// Click outside the editor, on the backdrop that covers the page while it is open.
Cypress.Commands.add('clickEditorBackdrop', () => {
  cy.get('#stemma-editor-graph-container-modal-backdrop').click('topLeft', { force: true });
  cy.get('#modalDialog').should('be.visible');
  // Bootstrap ignores a close request while the modal is still fading in, so wait for the
  // focus that marks the end of the fade-in before any button is clicked.
  cy.focused().should('have.id', 'modalDialog');
  cy.get('#modalDialogLabel').should('have.text', 'Close stemma editor?');
});

// A small valid stemma over some of a tradition's witnesses.
export const stemmaDot = (name, [a, b, c]) =>
  `digraph "${name}" {\n  "α" [class=hypothetical label="α"];\n  ${a} [class=extant];\n  ${b} [class=extant];\n  ${c} [class=extant];\n  "α" -> ${a};\n  "α" -> ${b};\n  ${a} -> ${c};\n}\n`;

// The message console, newest first, as [{ type, text }] without the timestamps.
Cypress.Commands.add('messageConsoleShouldEqual', (expected) => {
  cy.get('#message-console-text-panel').should(($panel) => {
    const actual = [...$panel[0].querySelectorAll('.console-message')].map((el) => ({
      type: ['success', 'danger', 'warning', 'info', 'primary'].find((t) => el.classList.contains(t)),
      text: el.textContent.replace(/^\d{8}_\d{6}:\s*/, '').trim()
    }));
    expect(actual).to.deep.equal(expected);
  });
});
