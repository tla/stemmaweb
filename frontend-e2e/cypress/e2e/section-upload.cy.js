// Adding a section to an existing tradition through the upload dialog, in every format
// the dialog offers. All sample files hold the same collation (see fixtures/README.md),
// so every format must produce the same text for each witness.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';

const owner = users.find(({ username }) => username === 'user@example.org');
const FLORILEGIUM = traditions.find(({ title }) => title.startsWith('Florilegium'));
const EXISTING_SECTIONS = FLORILEGIUM.sections.map(({ name }) => name);
const OWN_TRADITIONS = traditions
  .filter(({ owner: o }) => o === owner.username)
  .map(({ title }) => title)
  .sort((a, b) => a.localeCompare(b));

// Witnesses B, D and Q, as Stemmarest should reconstruct them.
const EXPECTED_TEXT = {
  B: 'Իսկ ընդ աւուրսն և ի թվականութիւն ՆԱ',
  D: 'Իսկ ընդ ի թուականու՟ի ՆԱ',
  Q: 'Իսկ ընդ աւուրսնս այսոսիկ'
};

const FORMATS = [
  { type: 'csv', file: 'armexample.csv' },
  { type: 'tsv', file: 'armexample.tsv' },
  // armexample.xls differs from the other files in two Q cells
  {
    type: 'xls',
    file: 'armexample.xls',
    text: { Q: 'Իսկ ընդ աւուրսն այնոսիկ' }
  },
  {
    type: 'xlsx',
    file: 'armexample.xlsx',
    knownBug:
      'the dialog has no "xlsx" option, and Stemmarest rejects an .xlsx sent as "xls"'
  },
  { type: 'collatex', file: 'armexample.collatex.xml' },
  { type: 'cxjson', file: 'armexample.cx.json' }
  // Still to add once sample files exist: teips, cte, graphml, stemmaweb
];

describe('Add a section dialog', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => cy.reseedDB());

  FORMATS.forEach(({ type, file, text, knownBug }) => {
    const title = `adds a section from a ${type} file, with the right text for every witness`;
    if (knownBug) {
      it.skip(`${title} (known bug: ${knownBug})`, () => {});
      return;
    }
    it(title, () => {
      const name = `Uploaded ${type}`;
      cy.visitAs(owner);
      cy.selectTradition(FLORILEGIUM.title);
      cy.openAddSectionDialog();
      cy.get('#upload_for_tradition option:selected').should('have.text', FLORILEGIUM.title);
      cy.fillSectionForm({ name, file: `cypress/fixtures/${file}`, type });
      cy.submitSectionForm();

      cy.contains('stemmaweb-alert', 'Section created');
      cy.addSectionDialogShouldBeClosed();
      cy.sectionNamesShouldEqual(FLORILEGIUM.title, [...EXISTING_SECTIONS, name]);

      // what Stemmarest actually stored
      cy.storedSections(FLORILEGIUM.title).then(({ tradId, sections }) => {
        expect(sections.map((s) => s.name)).to.deep.equal([...EXISTING_SECTIONS, name]);
        const uploaded = sections[sections.length - 1];
        Object.entries({ ...EXPECTED_TEXT, ...text }).forEach(([sigil, expected]) => {
          cy.witnessText(tradId, uploaded.id, sigil).should('equal', expected);
        });
      });

      // and it is still there after a reload
      cy.reload();
      cy.appReady();
      cy.selectTradition(FLORILEGIUM.title);
      cy.sectionNamesShouldEqual(FLORILEGIUM.title, [...EXISTING_SECTIONS, name]);
    });
  });

  it('offers only the traditions the user owns', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openAddSectionDialog();
    cy.get('#upload_for_tradition option').should(($options) => {
      const titles = [...$options].map((o) => o.textContent.trim());
      expect(titles.sort((a, b) => a.localeCompare(b))).to.deep.equal(OWN_TRADITIONS);
    });
  });

  it('asks for a name and a file, and sends nothing without them', () => {
    cy.intercept('POST', '**/section', cy.spy().as('upload'));
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openAddSectionDialog();
    cy.submitSectionForm();
    cy.get('#add_tradition_form').should('have.class', 'was-validated');
    cy.get('#add_tradition_modal').should('be.visible');
    cy.get('@upload').should('not.have.been.called');
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, EXISTING_SECTIONS);
  });

  it('keeps the dialog open and adds nothing when the server rejects the upload', () => {
    cy.intercept('POST', '**/section', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('upload');
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openAddSectionDialog();
    cy.fillSectionForm({
      name: 'Rejected',
      file: 'cypress/fixtures/armexample.csv',
      type: 'csv'
    });
    cy.submitSectionForm();
    cy.wait('@upload');

    cy.contains('stemmaweb-alert', 'Error');
    cy.get('#add_tradition_modal').should('be.visible');
    cy.get('#add_tradition_modal .btn-close').click();
    cy.addSectionDialogShouldBeClosed();
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, EXISTING_SECTIONS);
  });

  it('reports an error for a file that does not match the chosen format', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openAddSectionDialog();
    cy.fillSectionForm({
      name: 'Wrong format',
      file: 'cypress/fixtures/armexample.csv',
      type: 'cxjson'
    });
    cy.submitSectionForm();

    cy.contains('stemmaweb-alert', 'Error');
    cy.get('#add_tradition_modal').should('be.visible');
    cy.get('#add_tradition_modal .btn-close').click();
    cy.addSectionDialogShouldBeClosed();
    cy.storedSections(FLORILEGIUM.title).then(({ sections }) => {
      expect(sections.map((s) => s.name)).to.deep.equal(EXISTING_SECTIONS);
    });
  });
});
