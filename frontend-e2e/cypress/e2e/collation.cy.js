// The collation view: opening it, what it draws for a section, switching sections, selecting a
// reading, and leaving it. Changing the collation (relations, merging, splitting, relation types)
// is not covered yet.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';

const owner = users.find(({ username }) => username === 'user@example.org');
const otherUser = users.find(({ username }) => username === 'benutzer@example.org');
const tradition = (start) => traditions.find((t) => t.title.startsWith(start));

const LEGEND = tradition("Legend's"); // owned by user: 2 sections, 31 and ? readings, 13 relations in the first
const ARABIC = tradition('Arabic'); // owned by benutzer: 1 small section, 1 relation
const JOHN = tradition('John verse'); // public, owned by benutzer: 1 section, no relations

// The collation view draws its edges with SVGPathElement.getPathData(), which browsers do not
// implement; the old Stemmaweb shipped path-data-polyfill.js for it and this one does not. The
// error is thrown while the view is drawn, but the view still works, so the tests below ignore
// exactly this error. The "known bug" test at the end does not.
const ignoreMissingPathData = () => {
  cy.on('uncaught:exception', (err) => !/getPathData is not a function/.test(err.message));
};

describe('Collation view', () => {
  beforeEach(ignoreMissingPathData);

  [
    { user: owner, t: LEGEND },
    { user: otherUser, t: ARABIC }
  ].forEach(({ user, t }) => {
    it(`opens "${t.title}" for its owner on the first section, with its readings and relations`, () => {
      cy.visitAs(user);
      cy.selectTradition(t.title);
      cy.storedCollation(t.title).then(({ section, readings, relations, relationTypes }) => {
        cy.openCollation();
        cy.get('#edit-collation-button').should('have.class', 'selected-view');
        cy.get('#view-stemmata-button').should('not.have.class', 'selected-view');
        cy.get('#stemma-editor-graph-container').should('not.be.visible');
        cy.sectionTitleShouldBe(t.sections[0].name);
        cy.collationGraphShouldShow({ readings, relations });
        cy.get('node-density-chart svg').should('exist');
        // the relation types of the tradition are listed
        cy.get('relation-types').should(($panel) => {
          const text = $panel.text();
          relationTypes.forEach((type) => expect(text).to.contain(type.name));
        });
        // with the section's own details to start with
        cy.get('reading-properties-view').should(($p) => {
          const text = $p.text().replace(/\s+/g, ' ');
          expect(text).to.contain(`Section ${section.id}`);
          expect(text).to.contain(`Name ${section.name}`);
          expect(text).to.contain(`Language ${section.language}`);
        });
      });
    });
  });

  it('lists every section of the tradition in the section menu', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.openCollation();
    cy.get('#section-selectors-menu-button').should('have.text', 'Select section');
    cy.get('#section-selectors .section-selector').should(($items) => {
      expect([...$items].map((i) => i.textContent.trim())).to.deep.equal(LEGEND.sections.map((s) => s.name));
    });
  });

  it('draws the section picked from the menu, with its own readings and relations', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.openCollation();
    cy.storedCollation(LEGEND.title, 1).then((second) => {
      cy.selectCollationSection(LEGEND.sections[1].name);
      cy.sectionTitleShouldBe(LEGEND.sections[1].name);
      cy.collationGraphShouldShow(second);
      cy.get('#section-selectors .section-selector.selected').should('have.text', ` ${LEGEND.sections[1].name}`);
    });
  });

  it('opens on the section already selected in the sidebar', () => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
    cy.selectSection(LEGEND.title, LEGEND.sections[1].name);
    cy.storedCollation(LEGEND.title, 1).then((second) => {
      cy.openCollation();
      cy.sectionTitleShouldBe(LEGEND.sections[1].name);
      cy.collationGraphShouldShow(second);
    });
  });

  it('shows a reading in the properties when it is clicked, and the section again when the background is', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(ARABIC.title);
    cy.storedCollation(ARABIC.title).then(({ section, readings, relations }) => {
      cy.openCollation();
      cy.collationGraphShouldShow({ readings, relations });
      const reading = readings.find((r) => r.text && !r.is_start && !r.is_end);
      cy.selectReading(reading.id);
      cy.get('#reading-properties-tab').should('have.class', 'active');
      cy.get('#section-properties-tab').should('not.have.class', 'active');
      cy.get('reading-properties-view').should(($p) => expect($p.text()).to.contain(reading.text));
      cy.get('#relation-graph').click('topLeft', { force: true });
      cy.get('#relation-graph svg g.node.selected').should('not.exist');
      // the reading's details go, the section's stay (the Readings tab stays selected)
      cy.get('reading-properties-view').should(($p) => {
        const text = $p.text().replace(/\s+/g, ' ');
        expect(text).to.contain(`Section ${section.id}`);
        expect(text).not.to.contain(`Reading ${reading.id}`);
        expect(text).not.to.contain(reading.text);
      });
    });
  });

  const editButton = (what) => cy.get(`a[aria-label="${what} reading button"], a[aria-label="${what} readings button"]`);

  it('switches the editing buttons off until a reading is selected', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(ARABIC.title);
    cy.openCollation();
    ['concatenate', 'split', 'detach', 'merge'].forEach((what) => editButton(what).should('have.class', 'greyed-out'));
  });

  it('offers split and detach for one selected reading, and merge and concatenate only for several', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(ARABIC.title);
    cy.storedCollation(ARABIC.title).then(({ readings }) => {
      cy.openCollation();
      const [first] = readings.filter((r) => r.text && !r.is_start && !r.is_end);
      cy.selectReading(first.id);
      editButton('split').should('not.have.class', 'greyed-out');
      editButton('detach').should('not.have.class', 'greyed-out');
      editButton('concatenate').should('have.class', 'greyed-out');
      editButton('merge').should('have.class', 'greyed-out');
    });
  });

  it('goes back to the stemma view with "View stemmata"', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(ARABIC.title);
    cy.openCollation();
    cy.get('#view-stemmata-button').click();
    cy.get('#view-stemmata-button').should('have.class', 'selected-view');
    cy.get('#edit-collation-button').should('not.have.class', 'selected-view');
    cy.get('relation-mapper').should('not.be.visible');
    cy.get('#stemma-editor-graph-container').should('be.visible');
    cy.get('#tradition_info:visible').should('exist');
  });
});

describe('Collation view for someone who may not edit', () => {
  beforeEach(ignoreMissingPathData);

  [
    { user: null, what: 'a guest' },
    { user: owner, what: 'another user' }
  ].forEach(({ user, what }) => {
    it(`shows ${what} the graph of a public tradition, under the name "View Collation"`, () => {
      cy.visitAs(user);
      cy.selectTradition(JOHN.title);
      cy.get('#edit-collation-button').should('have.text', 'View Collation');
      cy.storedCollation(JOHN.title).then(({ readings, relations }) => {
        cy.openCollation();
        cy.sectionTitleShouldBe(JOHN.sections[0].name);
        cy.collationGraphShouldShow({ readings, relations });
      });
    });
  });

  it('lists the relation types of a public tradition for another user', () => {
    const NOTRE_BESOIN = tradition('Notre besoin'); // public, owned by user; the only public tradition with relation types
    cy.visitAs(otherUser);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.storedCollation(NOTRE_BESOIN.title).then(({ relationTypes }) => {
      expect(relationTypes.length).to.be.greaterThan(0);
      cy.openCollation();
      cy.get('relation-types').should(($panel) => {
        relationTypes.forEach((type) => expect($panel.text()).to.contain(type.name));
      });
    });
  });

  // Known gap: the add, edit and delete relation type links are not greyed out for someone who does
  // not own the tradition, and clicking "Edit relation type" opens its dialog. (The server refuses
  // the change, see the next test.)
  it.skip('greys out the relation type controls for another user (known gap: they are all active)', () => {
    const NOTRE_BESOIN = tradition('Notre besoin');
    cy.visitAs(otherUser);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.openCollation();
    cy.get('relation-types a[aria-label*="relation type"]').should('have.length.greaterThan', 0);
    cy.get('relation-types a[aria-label*="relation type"]:not(.greyed-out)').should('not.exist');
  });

  [
    { who: 'another user', user: otherUser },
    { who: 'a guest', user: null }
  ].forEach(({ who, user }) => {
    it(`has the server refuse ${who} changing or deleting a relation type of someone else's tradition`, () => {
      const NOTRE_BESOIN = tradition('Notre besoin');
      const api = `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
      cy.reseedDB();
      if (user) cy.login(user);
      else cy.clearCookies();
      cy.request(`${api}/traditions`).then(({ body }) => {
        const id = body.find((t) => t.name === NOTRE_BESOIN.title).id;
        cy.request(`${api}/tradition/${id}/relationtypes`).then(({ body: before }) => {
          const target = before[0];
          cy.request({ method: 'PUT', url: `${api}/tradition/${id}/relationtype/${target.name}`, failOnStatusCode: false, body: { ...target, description: 'changed' } })
            .its('status').should('eq', 403);
          cy.request({ method: 'DELETE', url: `${api}/tradition/${id}/relationtype/${target.name}`, failOnStatusCode: false })
            .its('status').should('eq', 403);
          cy.request(`${api}/tradition/${id}/relationtypes`).its('body').should('deep.equal', before);
        });
      });
    });
  });

  // Known bug: relationTypes.js assigns colours to the relation types of a legacy tradition and saves
  // them with AUTH_STORE.state.user.id. A guest has no user, so this throws (relationTypes.js:143, an
  // unhandled rejection) and the relation types are never drawn.
  it.skip('lists the relation types of a public tradition for a guest (known bug: crashes without a user)', () => {
    const NOTRE_BESOIN = tradition('Notre besoin');
    cy.visitAs(null);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.storedCollation(NOTRE_BESOIN.title).then(({ relationTypes }) => {
      cy.openCollation();
      cy.get('relation-types').should(($panel) => {
        relationTypes.forEach((type) => expect($panel.text()).to.contain(type.name));
      });
    });
  });
});

describe('Collation view, known bug', () => {
  // No exception filter here: opening the view throws "this[#path].getPathData is not a function"
  // (see above). Un-skip once the polyfill is back or the code stops needing it.
  it.skip('opens without any error in the page (known bug: getPathData is not implemented)', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(ARABIC.title);
    cy.openCollation();
    cy.sectionTitleShouldBe(ARABIC.sections[0].name);
  });
});
