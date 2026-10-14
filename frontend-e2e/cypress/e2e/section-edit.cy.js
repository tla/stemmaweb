// Editing a section's name and language ("Edit section properties").
// Who may edit is covered in sections.cy.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList } from '../support/expectations';

const owner = users.find(({ username }) => username === 'user@example.org');
const admin = users.find(({ role }) => role === 'admin');
const tradition = (title) => traditions.find((t) => t.title === title);

const LEGEND = tradition("Legend's fragment"); // owned by user; sections: its own name, 'section 2'
const [LEGEND_FIRST, LEGEND_SECOND] = LEGEND.sections;
const JOHN = tradition('John verse'); // owned by benutzer, public; one section
const LEGEND_NAMES = LEGEND.sections.map(({ name }) => name);

const sectionsOf = (title) => cy.storedSections(title).then(({ sections }) => sections);

describe('Edit section properties', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => cy.reseedDB());

  it('shows the stored values in the dialog', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.selectSection(LEGEND.title, LEGEND_SECOND.name);
    cy.openEditSectionProperties();
    cy.get('#name_input').should('have.value', LEGEND_SECOND.name);
    cy.get('#language_input').should('have.value', LEGEND_SECOND.language);
  });

  it('lets an owner rename a section and change its language, everywhere it is shown', () => {
    const newName = 'section two (revised)';
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.selectSection(LEGEND.title, LEGEND_SECOND.name);
    cy.openEditSectionProperties();
    cy.fillProperties({ name: newName, language: 'Syriac' });
    cy.clickDialogButton('Save');
    cy.contains('stemmaweb-alert', 'Section properties updated.');
    cy.dialogShouldBeClosed();

    // the properties pane and the sidebar list agree, and the other section is untouched
    const shown = () => {
      cy.sectionPropertyShouldBe('Name', newName);
      cy.sectionPropertyShouldBe('Language', 'Syriac');
      cy.sectionNamesShouldEqual(LEGEND.title, [LEGEND_FIRST.name, newName]);
    };
    shown();
    cy.selectSection(LEGEND.title, LEGEND_FIRST.name);
    cy.sectionPropertyShouldBe('Language', LEGEND_FIRST.language);
    cy.selectSection(LEGEND.title, newName);
    shown();

    // the server holds the change, and only for this section
    sectionsOf(LEGEND.title).then((sections) => {
      expect(sections.map((s) => [s.name, s.language])).to.deep.equal([
        [LEGEND_FIRST.name, LEGEND_FIRST.language],
        [newName, 'Syriac']
      ]);
    });

    cy.reload();
    cy.appReady();
    cy.selectTradition(LEGEND.title);
    cy.sectionNamesShouldEqual(LEGEND.title, [LEGEND_FIRST.name, newName]);
    cy.selectSection(LEGEND.title, newName);
    shown();
  });

  it("lets an admin edit a section of someone else's tradition", () => {
    cy.visitAs(admin);
    cy.selectTradition(JOHN.title);
    cy.selectSection(JOHN.title, JOHN.sections[0].name);
    cy.openEditSectionProperties();
    cy.fillProperties({ name: 'John, revised' });
    cy.clickDialogButton('Save');
    cy.dialogShouldBeClosed();
    cy.sectionNamesShouldEqual(JOHN.title, ['John, revised']);
    sectionsOf(JOHN.title).then((sections) => {
      expect(sections.map((s) => s.name)).to.deep.equal(['John, revised']);
    });
  });

  it('does not change the tradition itself', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.selectSection(LEGEND.title, LEGEND_FIRST.name);
    cy.openEditSectionProperties();
    cy.fillProperties({ name: 'Renamed section' });
    cy.clickDialogButton('Save');
    cy.dialogShouldBeClosed();
    cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.equal(LEGEND.title));
    cy.propertyShouldBe('Language', LEGEND.language);
    cy.traditionListShouldEqual(expectedTraditionList(owner, traditions));
  });

  it('discards the changes when the dialog is closed without saving', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.selectSection(LEGEND.title, LEGEND_SECOND.name);
    cy.openEditSectionProperties();
    cy.fillProperties({ name: 'Never saved', language: 'Latin' });
    cy.clickDialogButton('Close');
    cy.dialogShouldBeClosed();
    cy.sectionPropertyShouldBe('Name', LEGEND_SECOND.name);
    cy.sectionPropertyShouldBe('Language', LEGEND_SECOND.language);
    cy.sectionNamesShouldEqual(LEGEND.title, LEGEND_NAMES);
  });

  [
    { field: 'name', values: { name: '' } },
    { field: 'language', values: { language: '' } }
  ].forEach(({ field, values }) => {
    it(`refuses a blank ${field} and keeps the dialog open`, () => {
      cy.visitAs(owner);
      cy.selectTradition(LEGEND.title);
      cy.selectSection(LEGEND.title, LEGEND_SECOND.name);
      cy.openEditSectionProperties();
      cy.fillProperties({ name: 'A new name', language: 'Latin', ...values });
      cy.clickDialogButton('Save');
      cy.get('#modalDialog').should('be.visible');
      cy.get('#edit-section-properties-form').should('have.class', 'was-validated');
      cy.get('stemmaweb-alert').should('not.exist');
      cy.clickDialogButton('Close');
      cy.dialogShouldBeClosed();
      cy.sectionNamesShouldEqual(LEGEND.title, LEGEND_NAMES);
    });
  });

  it('keeps the dialog open and the data unchanged when the server rejects the save', () => {
    cy.intercept('PUT', '**/api/tradition/*/section/*', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('save');
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.selectSection(LEGEND.title, LEGEND_SECOND.name);
    cy.openEditSectionProperties();
    cy.fillProperties({ name: 'Rejected name' });
    cy.clickDialogButton('Save');
    cy.wait('@save');
    cy.contains('stemmaweb-alert', 'Error');
    cy.get('#modalDialog').should('be.visible');
    cy.clickDialogButton('Close');
    cy.dialogShouldBeClosed();
    cy.sectionNamesShouldEqual(LEGEND.title, LEGEND_NAMES);
  });
});
