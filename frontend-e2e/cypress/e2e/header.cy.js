import users from '../fixtures/users.json';

describe('Page header', () => {
  it('offers a guest sign-in, the About page and the site heading', () => {
    cy.visitAs(null);
    cy.get('header').within(() => {
      cy.contains('a', 'Sign in').should('be.visible');
      cy.contains('a', 'About').should('be.visible');
      cy.contains(
        'a',
        'Stemmaweb — a collection of tools for the analysis of collated texts'
      ).should('be.visible');
      cy.root().should('not.contain', 'Sign out');
    });
  });

  it('shows a signed-in user their name and a sign-out link instead', () => {
    const user = users.find(({ role }) => role === 'user');
    cy.visitAs(user);
    cy.get('header').within(() => {
      cy.contains('a', `Logged in as ${user.username}`);
      cy.contains('a', 'Sign out');
      cy.root().should('not.contain', 'Sign in');
    });
  });
});
