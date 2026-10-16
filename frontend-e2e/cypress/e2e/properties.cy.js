// The "Edit properties" dialog: what it shows, what saving does, and what it must not do.
// Who may open it is covered in permissions.cy.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { expectedTraditionList } from '../support/expectations';

const user = users.find(({ username }) => username === 'user@example.org');
const otherUser = users.find(({ username }) => username === 'benutzer@example.org');
const admin = users.find(({ role }) => role === 'admin');

const DIRECTIONS = {
  'Left to Right': { value: 'LR', label: 'Left to Right' },
  'Right to Left': { value: 'RL', label: 'Right to Left' },
  'Bi-directional': { value: 'BI', label: 'Bi-directional' }
};
const tradition = (title) => traditions.find((t) => t.title === title);
const withChange = (title, change) =>
  traditions.map((t) => (t.title === title ? { ...t, ...change } : t));

const FLORILEGIUM = tradition('Florilegium "Coislinianum B"'); // private, owned by user
const NOTRE_BESOIN = tradition('Notre besoin'); // public, owned by user
const VERBUM = tradition('Verbum'); // private, owned by benutzer

describe('Edit properties dialog contents', () => {
  traditions.forEach((t) => {
    it(`shows the stored values of "${t.title}" to an admin`, () => {
      cy.visitAs(admin);
      cy.selectTradition(t.title);
      cy.openEditProperties();
      cy.get('#name_input').should('have.value', t.title);
      cy.get('#language_input').should('have.value', t.language);
      cy.get('#direction_input').should('have.value', DIRECTIONS[t.direction].value);
      cy.get('#access_input').should(
        t.access === 'Public' ? 'be.checked' : 'not.be.checked'
      );
      cy.get('#owner_input').should('have.value', t.owner);
    });
  });

  it('offers an owner their own tradition, without the owner dropdown', () => {
    cy.visitAs(user);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openEditProperties();
    cy.get('#name_input').should('have.value', FLORILEGIUM.title);
    cy.get('#owner_input').should('not.exist');
  });
});

describe('Saving edited properties', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => cy.reseedDB());

  it('lets an owner change every property, and the changes survive a reload', () => {
    const newName = 'Florilegium (revised)';
    cy.visitAs(user);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openEditProperties();
    cy.fillProperties({
      name: newName,
      language: 'Syriac',
      direction: 'RL',
      isPublic: true
    });
    cy.clickDialogButton('Save');
    cy.contains('stemmaweb-alert', 'Metadata properties updated.');
    cy.dialogShouldBeClosed();

    const shown = () => {
      cy.get('#tradition-name').should(($n) =>
        expect($n.text().trim()).to.equal(newName)
      );
      cy.propertyShouldBe('Access', 'Public');
      cy.propertyShouldBe('Language', 'Syriac');
      cy.propertyShouldBe('Direction', 'Right to Left');
      cy.propertyShouldBe('Owner', user.username);
    };
    shown();
    cy.traditionListShouldEqual(
      expectedTraditionList(
        user,
        withChange(FLORILEGIUM.title, { title: newName, access: 'Public' })
      ).map((title) => (title === FLORILEGIUM.title ? newName : title))
    );

    // the server, not just the page, has the new values
    cy.reload();
    cy.appReady();
    cy.selectTradition(newName);
    shown();
  });

  [
    { traditionTitle: NOTRE_BESOIN.title, access: 'Private', isPublic: false },
    { traditionTitle: FLORILEGIUM.title, access: 'Public', isPublic: true }
  ].forEach(({ traditionTitle, access, isPublic }) => {
    it(`makes "${traditionTitle}" ${access} for everyone, not just for the owner`, () => {
      const changed = withChange(traditionTitle, { access });
      cy.visitAs(user);
      cy.selectTradition(traditionTitle);
      cy.openEditProperties();
      cy.fillProperties({ isPublic });
      cy.clickDialogButton('Save');
      cy.dialogShouldBeClosed();

      [null, otherUser, admin, user].forEach((viewer) => {
        cy.visitAs(viewer);
        cy.traditionListShouldEqual(expectedTraditionList(viewer, changed));
      });
    });
  });

  it('lets an admin change the owner, who can then edit the tradition', () => {
    cy.visitAs(admin);
    cy.selectTradition(VERBUM.title);
    cy.openEditProperties();
    cy.get('#owner_input').should('have.value', otherUser.username);
    cy.fillProperties({ owner: user.username });
    cy.clickDialogButton('Save');
    cy.dialogShouldBeClosed();
    cy.propertyShouldBe('Owner', user.username);

    cy.visitAs(user);
    cy.traditionListShouldEqual(
      expectedTraditionList(user, withChange(VERBUM.title, { owner: user.username }))
    );
    cy.selectTradition(VERBUM.title);
    cy.editPropertiesShouldBe(true);

    cy.visitAs(otherUser);
    cy.traditionListShouldEqual(
      expectedTraditionList(otherUser, withChange(VERBUM.title, { owner: user.username }))
    );
  });

  it('discards the changes when the dialog is closed without saving', () => {
    cy.visitAs(user);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openEditProperties();
    cy.fillProperties({ name: 'Never saved', language: 'Latin', isPublic: true });
    cy.clickDialogButton('Close');
    cy.dialogShouldBeClosed();

    cy.get('#tradition-name').should(($n) =>
      expect($n.text().trim()).to.equal(FLORILEGIUM.title)
    );
    cy.propertyShouldBe('Access', 'Private');
    cy.propertyShouldBe('Language', FLORILEGIUM.language);
    cy.reload();
    cy.appReady();
    cy.traditionListShouldEqual(expectedTraditionList(user, traditions));
  });

  it('refuses a blank name and keeps the dialog open', () => {
    cy.visitAs(user);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openEditProperties();
    cy.fillProperties({ name: '', language: 'Latin' });
    cy.clickDialogButton('Save');

    cy.get('#modalDialog').should('be.visible');
    cy.get('#edit-tradition-properties-form').should('have.class', 'was-validated');
    cy.get('stemmaweb-alert').should('not.exist');
    cy.clickDialogButton('Close');
    cy.dialogShouldBeClosed();
    cy.propertyShouldBe('Language', FLORILEGIUM.language);
  });

  it('keeps the dialog open and the data unchanged when the server rejects the save', () => {
    cy.intercept('PUT', '**/api/tradition/*', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('save');
    cy.visitAs(user);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openEditProperties();
    cy.fillProperties({ name: 'Rejected name' });
    cy.clickDialogButton('Save');
    cy.wait('@save');

    cy.contains('stemmaweb-alert', 'Error');
    cy.get('#modalDialog').should('be.visible');
    cy.clickDialogButton('Close');
    cy.dialogShouldBeClosed();
    cy.get('#tradition-name').should(($n) =>
      expect($n.text().trim()).to.equal(FLORILEGIUM.title)
    );
  });
});
