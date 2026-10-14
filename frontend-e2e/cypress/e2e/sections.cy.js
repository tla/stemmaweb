// The section list under each tradition, the section properties pane, and who may change them.
// Changing sections is covered in section-edit, section-delete and section-reorder.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { canModify, canSee, roleOf } from '../support/expectations';

const admin = users.find(({ role }) => role === 'admin');
const roles = [null, ...users];
const label = (user) => (user ? `${roleOf(user)} ${user.username}` : 'guest');

describe('Sections of each tradition', () => {
  traditions.forEach((t) => {
    it(`lists the sections of "${t.title}" in order`, () => {
      cy.visitAs(admin);
      cy.selectTradition(t.title);
      cy.sectionNamesShouldEqual(
        t.title,
        t.sections.map(({ name }) => name)
      );
    });

    t.sections.forEach((section) => {
      it(`shows the name and language of "${section.name}" in "${t.title}"`, () => {
        cy.visitAs(admin);
        cy.selectTradition(t.title);
        cy.selectSection(t.title, section.name);
        cy.sectionPropertyShouldBe('Name', section.name);
        cy.sectionPropertyShouldBe('Language', section.language);
      });
    });
  });

  it('clears the section properties when another tradition is selected', () => {
    const [first, second] = traditions;
    cy.visitAs(admin);
    cy.selectTradition(first.title);
    cy.selectSection(first.title, first.sections[0].name);
    cy.get('#section-info:visible').should('exist');
    cy.selectTradition(second.title);
    cy.get('#section-info:visible').should('not.exist');
  });
});

describe('Who may change sections', () => {
  roles.forEach((user) => {
    traditions
      .filter((t) => canSee(user, t))
      .forEach((t) => {
        const modify = canModify(user, t);
        it(`${label(user)} ${modify ? 'can' : 'cannot'} edit or delete the sections of "${t.title}"`, () => {
          cy.visitAs(user);
          cy.selectTradition(t.title);
          cy.selectSection(t.title, t.sections[0].name);
          cy.editSectionShouldBe(modify);
          cy.deleteSectionShouldBe(modify);
          if (!modify) {
            // clicking a greyed-out button opens nothing
            cy.get('edit-section-properties-button a').click();
            cy.get('delete-section-button a').click();
            cy.get('.modal.show').should('not.exist');
          }
        });
      });
  });
});
