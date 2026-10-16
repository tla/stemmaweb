// What the tradition view shows for each tradition: its title and the properties table.
// Changing the properties is covered in properties.cy.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';

const admin = users.find(({ role }) => role === 'admin');

describe('Tradition view', () => {
  traditions.forEach((t) => {
    it(`shows the title and properties of "${t.title}"`, () => {
      cy.visitAs(admin);
      cy.selectTradition(t.title);
      cy.get('#tradition-name').should(($n) => expect($n.text().trim()).to.equal(t.title));
      cy.propertyShouldBe('Owner', t.owner);
      cy.propertyShouldBe('Access', t.access);
      cy.propertyShouldBe('Language', t.language);
      cy.propertyShouldBe('Direction', t.direction);
      cy.propertyShouldBe('Witnesses', [...t.witnesses].sort().join(', '));
      // the id shown is the one Stemmarest uses
      cy.request(`${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api/traditions`).then(({ body }) => {
        cy.propertyShouldBe('Tradition', body.find((x) => x.name === t.title).id);
      });
    });

    it(`${t.stemmata.length ? 'shows the selected stemma' : 'has no stemma row'} in the properties of "${t.title}"`, () => {
      cy.visitAs(admin);
      cy.selectTradition(t.title);
      if (t.stemmata.length === 0) {
        cy.get('#tradition_info td.tradition-property-label-cell').should(($labels) => {
          expect([...$labels].map((l) => l.textContent.trim())).not.to.include('Stemma');
        });
      } else {
        cy.selectedStemmaName().then((selected) => cy.propertyShouldBe('Stemma', selected));
      }
    });
  });

  traditions
    .filter((t) => t.stemmata.length > 1)
    .forEach((t) => {
      it(`updates the stemma row when another stemma of "${t.title}" is selected`, () => {
        cy.visitAs(admin);
        cy.selectTradition(t.title);
        t.stemmata.forEach((name) => {
          cy.selectStemma(name);
          cy.propertyShouldBe('Stemma', name);
        });
      });
    });

  it('shows a guest the owner and witnesses of a public tradition, as it does an admin', () => {
    const t = traditions.find(({ access }) => access === 'Public');
    cy.visitAs(null);
    cy.selectTradition(t.title);
    cy.propertyShouldBe('Owner', t.owner);
    cy.propertyShouldBe('Witnesses', [...t.witnesses].sort().join(', '));
  });
});
