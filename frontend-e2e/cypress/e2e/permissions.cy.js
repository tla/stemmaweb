// What each role may do with each tradition it can see. These tests only read
// state; anything that changes data belongs in its own spec with a reseed.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import {
  canModify,
  collationButtonLabel,
  canSee,
  canUpload,
  roleOf
} from '../support/expectations';

const roles = [null, ...users];
const label = (user) => (user ? `${roleOf(user)} ${user.username}` : 'guest');

roles.forEach((user) => {
  describe(`Permissions of ${label(user)}`, () => {
    it(`${canUpload(user) ? 'can' : 'cannot'} upload a tradition`, () => {
      cy.visitAs(user);
      cy.contains('h6', 'Text directory')
        .find('svg.feather-plus-circle')
        .parents('a')
        .should(canUpload(user) ? 'not.have.class' : 'have.class', 'greyed-out');
    });

    if (!canUpload(user)) {
      it('cannot open the upload dialog', () => {
        cy.visitAs(user);
        cy.contains('h6', 'Text directory')
          .find('svg.feather-plus-circle')
          .parents('a')
          .click();
        // only a placeholder exists, it never becomes visible
        cy.get('add-tradition-modal > div').should('exist').and('not.be.visible');
      });
    }

    traditions
      .filter((tradition) => canSee(user, tradition))
      .forEach((tradition) => {
        const modify = canModify(user, tradition);
        it(`${modify ? 'can' : 'cannot'} modify "${tradition.title}" (${tradition.access}, owned by ${tradition.owner})`, () => {
          cy.visitAs(user);
          cy.selectTradition(tradition.title);
          cy.editPropertiesShouldBe(modify);
          cy.stemmaButtonShouldBe('Delete', modify);
          cy.stemmaButtonShouldBe('Run Stemweb', modify);
          if (!modify) {
            cy.get('property-table-view edit-properties-button').click();
            cy.get('.modal.show').should('not.exist');
            if (roleOf(user) === 'guest') {
              // guests don't get the dialog at all
              cy.contains('#modalDialogLabel', 'Edit properties').should('not.exist');
            } else {
              // users get the shared dialog element, but it never becomes visible
              cy.get('#modalDialog').should('exist').and('not.be.visible');
            }
          }
        });

        it(`opens "${tradition.title}" as ${collationButtonLabel(user, tradition)}`, () => {
          cy.visitAs(user);
          cy.selectTradition(tradition.title);
          cy.stemmaButtonShouldBe(collationButtonLabel(user, tradition), true);
        });

        it(`can download "${tradition.title}"`, () => {
          cy.visitAs(user);
          cy.selectTradition(tradition.title);
          cy.stemmaButtonShouldBe('Tradition', true);
        });
      });
  });
});
