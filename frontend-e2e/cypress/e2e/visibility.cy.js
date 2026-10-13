// Which traditions each role sees in the sidebar list, and in what order.
// Rules (#316, #317, #332): guests see public traditions; users see public plus
// their own; admins see everything. Own traditions come first, alphabetically,
// then a separator, then the others, alphabetically.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList, roleOf } from '../support/expectations';

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
