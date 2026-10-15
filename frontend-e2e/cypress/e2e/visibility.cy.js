// Which traditions each role sees in the sidebar list, and in what order.
// Rules (#316, #317, #332): guests see public traditions; users see public plus
// their own; admins see everything. Own traditions come first, alphabetically,
// then a separator, then the others, alphabetically.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList, roleOf, SEPARATOR } from '../support/expectations';

const roles = [null, ...users];
const label = (user) => (user ? `${roleOf(user)} ${user.username}` : 'guest');

describe('Tradition list', () => {
  roles.forEach((user) => {
    it(`shows ${label(user)} the right traditions in the right order`, () => {
      cy.visitAs(user);
      cy.traditionListShouldEqual(expectedTraditionList(user, traditions));
    });
  });
});

describe('Selected tradition in the list', () => {
  const SELECTED_FILL = 'rgb(207, 220, 238)';
  // exactly one folder icon is highlighted, and it belongs to `title`
  const onlyHighlighted = (title) => {
    cy.get('#traditions-list .folder-icon.selected').should('have.length', 1);
    cy.get('#traditions-list .folder-icon.selected')
      .closest('li')
      .find('span.tradition-nav-name')
      .should(($name) => expect($name.text().trim()).to.equal(title));
    cy.get('#traditions-list .folder-icon.selected svg').should('have.css', 'fill', SELECTED_FILL);
    cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.equal(title));
  };

  roles.forEach((user) => {
    it(`highlights only the first tradition on load, then only the one clicked, for ${label(user)}`, () => {
      cy.visitAs(user);
      const titles = expectedTraditionList(user, traditions).filter((t) => t !== SEPARATOR);
      onlyHighlighted(titles[0]);
      [...titles].reverse().forEach((title) => {
        cy.selectTradition(title);
        onlyHighlighted(title);
      });
    });
  });
});
