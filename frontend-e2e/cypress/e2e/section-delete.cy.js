// Deleting a section. Who may delete is covered in sections.cy.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList } from '../support/expectations';

const owner = users.find(({ username }) => username === 'user@example.org');
const admin = users.find(({ role }) => role === 'admin');
const tradition = (title) => traditions.find((t) => t.title === title);

const FLORILEGIUM = tradition('Florilegium "Coislinianum B"'); // owned by user; 4 sections
const FLOR_NAMES = FLORILEGIUM.sections.map(({ name }) => name);
const LEGEND = tradition("Legend's fragment"); // owned by user; 2 sections
const NOTRE_BESOIN = tradition('Notre besoin'); // owned by user; 1 section
const JOHN = tradition('John verse'); // owned by benutzer; 1 section

const without = (names, name) => names.filter((n) => n !== name);

describe('Delete section', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => cy.reseedDB());

  FLOR_NAMES.forEach((name, position) => {
    const where = ['first', 'second', 'third', 'last'][position];
    it(`deletes the ${where} section ("${name}") and keeps the others in order`, () => {
      const remaining = without(FLOR_NAMES, name);
      cy.visitAs(owner);
      cy.selectTradition(FLORILEGIUM.title);
      cy.selectSection(FLORILEGIUM.title, name);
      cy.openDeleteSection();
      cy.contains('#modalDialog', name);
      cy.clickDialogButton('Yes, delete it');
      cy.contains('stemmaweb-alert', `Deleted ${name}`);
      cy.dialogShouldBeClosed();

      cy.sectionNamesShouldEqual(FLORILEGIUM.title, remaining);
      cy.get('#section-info:visible').should('not.exist');
      cy.storedSections(FLORILEGIUM.title).then(({ sections }) => {
        expect(sections.map((s) => s.name)).to.deep.equal(remaining);
      });

      cy.reload();
      cy.appReady();
      cy.selectTradition(FLORILEGIUM.title);
      cy.sectionNamesShouldEqual(FLORILEGIUM.title, remaining);
    });
  });

  it('leaves everything alone when the confirmation is cancelled', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.selectSection(FLORILEGIUM.title, FLOR_NAMES[1]);
    cy.openDeleteSection();
    cy.clickDialogButton('Cancel');
    cy.dialogShouldBeClosed();
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, FLOR_NAMES);
    cy.sectionPropertyShouldBe('Name', FLOR_NAMES[1]);
    cy.storedSections(FLORILEGIUM.title).then(({ sections }) => {
      expect(sections.map((s) => s.name)).to.deep.equal(FLOR_NAMES);
    });
  });

  it("does not touch another tradition's sections", () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.selectSection(FLORILEGIUM.title, FLOR_NAMES[0]);
    cy.openDeleteSection();
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    cy.selectTradition(LEGEND.title);
    cy.sectionNamesShouldEqual(LEGEND.title, LEGEND.sections.map(({ name }) => name));
  });

  it('lets the last section go, leaving an empty tradition', () => {
    const section = NOTRE_BESOIN.sections[0].name;
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.selectSection(NOTRE_BESOIN.title, section);
    cy.openDeleteSection();
    cy.clickDialogButton('Yes, delete it');
    cy.contains('stemmaweb-alert', `Deleted ${section}`);
    cy.dialogShouldBeClosed();

    // the tradition is still there, selected, and has no sections
    cy.sectionNamesShouldEqual(NOTRE_BESOIN.title, []);
    cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.equal(NOTRE_BESOIN.title));
    cy.propertyShouldBe('Owner', owner.username);
    cy.traditionListShouldEqual(expectedTraditionList(owner, traditions));
    cy.storedSections(NOTRE_BESOIN.title).then(({ sections }) => {
      expect(sections).to.have.length(0);
    });

    cy.reload();
    cy.appReady();
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.sectionNamesShouldEqual(NOTRE_BESOIN.title, []);
    cy.traditionListShouldEqual(expectedTraditionList(owner, traditions));
  });

  it("lets an admin delete a section of someone else's tradition", () => {
    cy.visitAs(admin);
    cy.selectTradition(JOHN.title);
    cy.selectSection(JOHN.title, JOHN.sections[0].name);
    cy.openDeleteSection();
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    cy.sectionNamesShouldEqual(JOHN.title, []);
    cy.storedSections(JOHN.title).then(({ sections }) => {
      expect(sections).to.have.length(0);
    });
  });

  it('reports an error and keeps the section when the server rejects the deletion', () => {
    cy.intercept('DELETE', '**/api/tradition/*/section/*', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('delete');
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.selectSection(FLORILEGIUM.title, FLOR_NAMES[0]);
    cy.openDeleteSection();
    cy.clickDialogButton('Yes, delete it');
    cy.wait('@delete');
    cy.contains('stemmaweb-alert', 'Error during deletion');
    cy.dialogShouldBeClosed();
    cy.sectionNamesShouldEqual(FLORILEGIUM.title, FLOR_NAMES);
  });
});
