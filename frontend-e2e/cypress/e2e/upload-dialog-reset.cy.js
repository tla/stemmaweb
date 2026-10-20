// The upload dialog ("Upload a new collation") must come back clean every time it is reopened: after
// being closed in any way, after a failed validation, and after a successful upload.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';

const owner = users.find(({ username }) => username === 'user@example.org');
const FLORILEGIUM = traditions.find(({ title }) => title.startsWith('Florilegium'));
const FILE = 'cypress/fixtures/armexample.csv';

// Every way of closing the dialog without saving
const CLOSERS = {
  'the X': () => cy.get('#add_tradition_modal .modal-header .btn-close').click(),
  'Close': () => cy.get('#add_tradition_form .add-tradition-modal_close').click(),
  'Esc': () => cy.get('body').type('{esc}'),
  'a click on the backdrop': () => cy.get('#add_tradition_modal').click('topLeft')
};

// The two kinds of upload: the opening step, the form it shows, and what to put in it
const MODES = {
  tradition: {
    open: () => cy.openAddTraditionDialog(),
    choose: () => {
      cy.get('#button_new_tradition').click();
      cy.get('#new_tradition_partial').should('not.have.class', 'hide');
    },
    fill: () => {
      cy.fillSectionForm({ name: 'Draft', file: FILE, type: 'tsv' });
      cy.get('#new_section_name').type('Draft section');
      cy.get('#new_lang').type('Armenian');
      cy.get('#direction').select('RL');
      cy.get('#new_public').check();
    }
  },
  section: {
    open: () => cy.openAddSectionDialog(),
    choose: () => {
      cy.get('#button_new_section').click();
      cy.get('#new_section_partial').should('not.have.class', 'hide');
    },
    fill: () => cy.fillSectionForm({ name: 'Draft', file: FILE, type: 'tsv' })
  }
};

// Open the dialog at its first step, without choosing what to upload.
const openDialog = () => {
  cy.contains('h6', 'Text directory').find('svg.feather-plus-circle').parents('a').click();
  cy.get('#add_tradition_modal').should('be.visible');
  cy.focused().should('have.id', 'add_tradition_modal');
};

// The dialog shows its first step, and the form behind it is empty, in its default state and not validated.
const shouldBeClean = (mode) => {
  cy.get('#add_tradition_modal_addition_type_choice').should('be.visible');
  cy.get('#add_tradition_partial').should('have.class', 'hide');
  cy.get('#add_tradition_form').should('not.have.class', 'was-validated');
  MODES[mode].choose();
  cy.get('#add_tradition_form').should('not.have.class', 'was-validated');
  cy.get('#new_name').should('have.value', '');
  cy.get('#uploadfile').should(($input) => expect($input[0].files).to.have.length(0));
  cy.get('#new_filetype').should('have.value', 'csv');
  cy.get('#add_tradition_form .invalid-feedback:visible').should('not.exist');
  if (mode === 'tradition') {
    cy.get('#new_section_name').should('have.value', '');
    cy.get('#new_lang').should('have.value', '');
    cy.get('#direction').should('have.value', 'LR');
    cy.get('#new_public').should('not.be.checked');
    cy.get('#new_section_partial').should('have.class', 'hide');
  } else {
    cy.get('#new_tradition_partial').should('have.class', 'hide');
  }
};

describe('The upload dialog comes back clean', () => {
  // The upload tests change data; start each from the seed data and leave it as found.
  beforeEach(() => {
    cy.reseedDB();
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
  });
  after(() => cy.reseedDB());

  Object.keys(MODES).forEach((mode) => {
    describe(`when adding a ${mode}`, () => {
      Object.entries(CLOSERS).forEach(([how, close]) => {
        it(`after a filled-in form is closed with ${how}`, () => {
          MODES[mode].open();
          MODES[mode].fill();
          close();
          cy.addSectionDialogShouldBeClosed();
          openDialog();
          shouldBeClean(mode);
        });

        it(`after a refused submit (red validation) is closed with ${how}`, () => {
          MODES[mode].open();
          cy.submitSectionForm();
          cy.get('#add_tradition_form').should('have.class', 'was-validated');
          cy.get('#add_tradition_form .invalid-feedback:visible').should('exist');
          close();
          cy.addSectionDialogShouldBeClosed();
          openDialog();
          shouldBeClean(mode);
        });
      });
    });
  });

  it('after a tradition was added', () => {
    MODES.tradition.open();
    MODES.tradition.fill();
    cy.submitSectionForm();
    cy.contains('stemmaweb-alert', 'Tradition created');
    cy.addSectionDialogShouldBeClosed();
    openDialog();
    shouldBeClean('tradition');
  });

  it('after a section was added', () => {
    MODES.section.open();
    MODES.section.fill();
    cy.submitSectionForm();
    cy.contains('stemmaweb-alert', 'Section created');
    cy.addSectionDialogShouldBeClosed();
    openDialog();
    shouldBeClean('section');
  });

  it('after a tradition was added, a section form is clean too, and the other way round', () => {
    MODES.tradition.open();
    MODES.tradition.fill();
    cy.submitSectionForm();
    cy.contains('stemmaweb-alert', 'Tradition created');
    cy.addSectionDialogShouldBeClosed();
    openDialog();
    shouldBeClean('section');
    CLOSERS.Close();
    cy.addSectionDialogShouldBeClosed();
    openDialog();
    shouldBeClean('tradition');
  });
});
