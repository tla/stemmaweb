/* Assert everything is visible for an admin */

import users from '../fixtures/users.json';
const admin = users.filter(({username}) => username === 'admin@example.org')[0];

beforeEach(() => {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
    cy.loginViaUi(admin);
});

afterEach(() => {
    cy.logoutViaUi(admin);
  });

describe('all traditions are listed', () => {
    it('under construction', () => {
        cy.get('ul#traditions-list > li .tradition-nav-name').each(($ele, index) => {
            cy.log( index+1 + '. li-text: ' + $ele.text().trim());
        });
    });
});
