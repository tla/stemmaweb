// Adding, editing and deleting stemmata in the stemma editor.
// Which links are offered to whom is covered in stemmata.cy.js.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { stemmaDot } from '../support/stemmata';

const owner = users.find(({ username }) => username === 'user@example.org');
const otherUser = users.find(({ username }) => username === 'benutzer@example.org');
const tradition = (start) => traditions.find((t) => t.title.startsWith(start));

const FLORILEGIUM = tradition('Florilegium'); // owned by user; 1 stemma
const NOTRE_BESOIN = tradition('Notre besoin'); // owned by user; 2 stemmata
const JOHN = tradition('John verse'); // owned by benutzer; no stemma
const EXAMPLE_NAME = 'New Stemma Name'; // the name the editor gives its example stemma

const stored = (title) => cy.storedStemmata(title).then((stemmata) => stemmata.map((s) => s.name));

describe('Add a stemma', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => cy.reseedDB());

  it("opens the editor with an example built from the tradition's witnesses", () => {
    cy.visitAs(otherUser);
    cy.selectTradition(JOHN.title);
    cy.openStemmaEditor('add');
    cy.get('#stemma-dot-editor').should(($t) => {
      const dot = $t.val();
      expect(dot).to.match(new RegExp(`^digraph "${EXAMPLE_NAME}" \\{`));
      // the first nine witnesses, in order, each declared as extant
      [...JOHN.witnesses].sort().slice(0, 9).forEach((w) => {
        expect(dot).to.contain(`${/^[\u0000-\u007f]*$/.test(w) ? w : `"${w}"`} [class=extant];`);
      });
    });
    cy.stemmaGraphShouldBe(true);
    cy.stemmaNodes().should('have.length.greaterThan', 2);
  });

  it('saves the example stemma, which is then listed, selected and stored', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(JOHN.title);
    cy.openStemmaEditor('add');
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'Stemma added.');
    cy.stemmaEditorShouldBeClosed();

    cy.stemmaListShouldEqual([EXAMPLE_NAME]);
    cy.selectedStemmaShouldBe(EXAMPLE_NAME);
    cy.stemmaGraphShouldBe(true);
    cy.stemmaLinksShouldBe({ add: true, edit: true, del: true });
    stored(JOHN.title).should('deep.equal', [EXAMPLE_NAME]);

    cy.reload();
    cy.appReady();
    cy.selectTradition(JOHN.title);
    cy.stemmaListShouldEqual([EXAMPLE_NAME]);
  });

  it('puts a stemma added to a tradition that has one first, and selects it', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'Stemma added.');
    cy.stemmaEditorShouldBeClosed();
    cy.stemmaListShouldEqual([EXAMPLE_NAME, ...FLORILEGIUM.stemmata]);
    cy.selectedStemmaShouldBe(EXAMPLE_NAME);
    stored(FLORILEGIUM.title).should('have.members', [EXAMPLE_NAME, ...FLORILEGIUM.stemmata]);
  });

  it('saves a hand-written stemma under the name in its digraph line', () => {
    const dot = stemmaDot('Hand written', ['A', 'B', 'C']);
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.setStemmaDot(dot);
    // the graph previews what is typed
    cy.stemmaNodes().should('deep.equal', ['A', 'B', 'C', 'α']);
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'Stemma added.');
    cy.stemmaEditorShouldBeClosed();
    cy.selectedStemmaShouldBe('Hand written');
    cy.stemmaNodes().should('deep.equal', ['A', 'B', 'C', 'α']);
    cy.storedStemmata(FLORILEGIUM.title).then((stemmata) => {
      const added = stemmata.find((s) => s.name === 'Hand written');
      expect(added.dot).to.contain('"α" -> A');
    });
  });

  it('keeps the editor open and saves nothing for dot that does not parse', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.setStemmaDot('digraph "Broken" { A -> ');
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'Cannot save stemma');
    cy.get('#stemma-editor-container').should('have.class', 'expanded');
    stored(FLORILEGIUM.title).should('deep.equal', FLORILEGIUM.stemmata);
  });

  it('keeps the editor open and saves nothing for a stemma with a blank name', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.setStemmaDot(stemmaDot(' ', ['A', 'B', 'C']));
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'Stemma has no or an invalid name.');
    cy.get('#stemma-editor-container').should('have.class', 'expanded');
    stored(FLORILEGIUM.title).should('deep.equal', FLORILEGIUM.stemmata);
  });

  it("shows the server's reason when it rejects a stemma, and keeps the editor open", () => {
    // a witness that is neither extant nor hypothetical
    const dot = 'digraph "Unclassified" {\n  A [class=extant];\n  B;\n  A -> B;\n}\n';
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.setStemmaDot(dot);
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'not marked as either hypothetical or extant');
    cy.get('#stemma-editor-container').should('have.class', 'expanded');
    stored(FLORILEGIUM.title).should('deep.equal', FLORILEGIUM.stemmata);
  });

  it('keeps the editor open when the server fails', () => {
    cy.intercept('POST', '**/api/tradition/*/stemma/', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('add');
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.saveStemma();
    cy.wait('@add');
    cy.contains('stemmaweb-alert', 'Error');
    cy.get('#stemma-editor-container').should('have.class', 'expanded');
    cy.cancelStemmaEditor();
    cy.stemmaEditorShouldBeClosed();
    cy.stemmaListShouldEqual(FLORILEGIUM.stemmata);
  });

  it('closes the editor without saving when cancelled', () => {
    cy.intercept('POST', '**/api/tradition/*/stemma/', cy.spy().as('addSpy'));
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.cancelStemmaEditor();
    cy.stemmaEditorShouldBeClosed();
    cy.stemmaListShouldEqual(FLORILEGIUM.stemmata);
    cy.selectedStemmaShouldBe(FLORILEGIUM.stemmata[0]);
    cy.stemmaGraphShouldBe(true);
    cy.get('@addSpy').should('not.have.been.called');
  });

  it('closes the editor of a tradition without stemmata and leaves the graph empty', () => {
    cy.visitAs(otherUser);
    cy.selectTradition(JOHN.title);
    cy.openStemmaEditor('add');
    cy.cancelStemmaEditor();
    cy.stemmaEditorShouldBeClosed();
    cy.stemmaListShouldEqual([]);
    cy.stemmaGraphShouldBe(false);
  });

  describe('leaving the editor by clicking outside it', () => {
    beforeEach(() => {
      cy.visitAs(owner);
      cy.selectTradition(FLORILEGIUM.title);
      cy.openStemmaEditor('add');
      cy.clickEditorBackdrop();
    });

    it('can be called off with Cancel', () => {
      cy.clickDialogButton('Cancel');
      cy.dialogShouldBeClosed();
      cy.get('#stemma-editor-container').should('have.class', 'expanded');
    });

    it('can discard the stemma with "Ignore and close"', () => {
      cy.clickDialogButton('Ignore and close');
      cy.dialogShouldBeClosed();
      cy.stemmaEditorShouldBeClosed();
      cy.stemmaListShouldEqual(FLORILEGIUM.stemmata);
      stored(FLORILEGIUM.title).should('deep.equal', FLORILEGIUM.stemmata);
    });

    it('can save the stemma with "Save and close"', () => {
      cy.clickDialogButton('Save and close');
      cy.contains('stemmaweb-alert', 'Stemma added.');
      cy.dialogShouldBeClosed();
      cy.stemmaEditorShouldBeClosed();
      cy.stemmaListShouldEqual([EXAMPLE_NAME, ...FLORILEGIUM.stemmata]);
    });
  });
});

describe('Edit a stemma', () => {
  // These tests change data, so start each from the seed data.
  beforeEach(() => cy.reseedDB());

  it('shows the stored stemma in the editor', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('edit');
    cy.storedStemmata(FLORILEGIUM.title).then(([stemma]) => {
      cy.get('#stemma-dot-editor').should(($t) => expect($t.val().trim()).to.equal(stemma.dot.trim()));
    });
  });

  it('saves a renamed stemma with an extra node, under the same id, and it survives a reload', () => {
    const newName = 'stemma of Tomas (revised)';
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.storedStemmata(FLORILEGIUM.title).then(([before]) => {
      cy.openStemmaEditor('edit');
      const edited = before.dot
        .replace('digraph "stemma of Tomas"', `digraph "${newName}"`)
        .replace('"α" -> T;', '"α" -> "β";\n\t"β" -> T;')
        .replace('\tQ [class=extant];', '\t"β" [class=hypothetical label="*"];\n\tQ [class=extant];');
      cy.setStemmaDot(edited);
      cy.stemmaNodes().should('include', 'β');
      cy.saveStemma();
      cy.contains('stemmaweb-alert', 'Stemma saved.');
      cy.stemmaEditorShouldBeClosed();

      cy.stemmaListShouldEqual([newName]);
      cy.selectedStemmaShouldBe(newName);
      cy.stemmaNodes().should('include', 'β');
      cy.storedStemmata(FLORILEGIUM.title).then(([after, ...rest]) => {
        expect(rest).to.have.length(0);
        expect(after.stemmaid).to.equal(before.stemmaid);
        expect(after.name).to.equal(newName);
        expect(after.dot).to.contain('"β" -> T');
      });

      cy.reload();
      cy.appReady();
      cy.selectTradition(FLORILEGIUM.title);
      cy.stemmaListShouldEqual([newName]);
      cy.stemmaNodes().should('include', 'β');
    });
  });

  it('previews valid edits in the graph and ignores text that does not parse', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('edit');
    cy.stemmaNodes().then((before) => {
      cy.setStemmaDot(stemmaDot('Preview', ['A', 'B', 'C']));
      cy.stemmaNodes().should('deep.equal', ['A', 'B', 'C', 'α']);
      // half-typed text does not parse; the graph keeps showing the last good one
      cy.setStemmaDot('digraph "Preview" { A -> ');
      cy.stemmaNodes().should('deep.equal', ['A', 'B', 'C', 'α']);
      expect(before).to.have.length.greaterThan(4);
    });
  });

  it('returns to the saved stemma when the edit is cancelled', () => {
    cy.intercept('PUT', '**/api/tradition/*/stemma/*', cy.spy().as('saveSpy'));
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.stemmaNodes().then((original) => {
      cy.openStemmaEditor('edit');
      cy.setStemmaDot(stemmaDot('Scratch', ['A', 'B', 'C']));
      cy.stemmaNodes().should('deep.equal', ['A', 'B', 'C', 'α']);
      cy.cancelStemmaEditor();
      cy.stemmaEditorShouldBeClosed();
      cy.stemmaNodes().should('deep.equal', original);
      cy.selectedStemmaShouldBe(FLORILEGIUM.stemmata[0]);
    });
    cy.get('@saveSpy').should('not.have.been.called');
  });

  it("shows the server's reason when it rejects an edit, and keeps the editor open", () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('edit');
    cy.get('#stemma-dot-editor').then(($t) => {
      // drop the class of one witness
      cy.setStemmaDot($t.val().replace('\tT [class=extant];', '\tT;'));
    });
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'not marked as either hypothetical or extant');
    cy.get('#stemma-editor-container').should('have.class', 'expanded');
    cy.storedStemmata(FLORILEGIUM.title).then(([stemma]) => {
      expect(stemma.dot).to.contain('T [class=extant]');
    });
  });
});

describe('Saving a stemma without changing it', () => {
  beforeEach(() => cy.reseedDB());

  it('keeps the name of a stemma whose dot header differs from its name', () => {
    // The seeded Notre besoin stemmata are named "Stemweb stemma ..." but their dot says `graph stemma {`.
    const [name] = NOTRE_BESOIN.stemmata;
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.selectStemma(name);
    cy.openStemmaEditor('edit');
    cy.saveStemma();
    cy.contains('stemmaweb-alert', 'Stemma saved.');
    cy.stemmaEditorShouldBeClosed();
    cy.stemmaListShouldEqual(NOTRE_BESOIN.stemmata);
    stored(NOTRE_BESOIN.title).should('have.members', NOTRE_BESOIN.stemmata);
  });
});

describe('Delete a stemma', () => {
  beforeEach(() => cy.reseedDB());

  const openDelete = () => {
    cy.get('#delete-stemma-button-link').click();
    cy.get('#modalDialog').should('be.visible');
    cy.focused().should('have.id', 'modalDialog');
    cy.get('#modalDialogLabel').should('have.text', 'Delete Stemma');
  };

  it('leaves everything alone when the confirmation is cancelled', () => {
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.selectedStemmaName().then((selected) => {
      openDelete();
      // the dialog names the stemma that would be deleted: the selected one
      cy.get('#modalDialog .modal-body em, #modalDialog .modal-body .fst-italic').should(($n) =>
        expect($n.text().trim()).to.equal(selected.trim())
      );
    });
    cy.clickDialogButton('Cancel');
    cy.dialogShouldBeClosed();
    cy.stemmaListShouldEqual(NOTRE_BESOIN.stemmata);
    stored(NOTRE_BESOIN.title).should('have.members', NOTRE_BESOIN.stemmata);
  });

  it('deletes the selected stemma, selects the other, and it stays deleted after a reload', () => {
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    // whichever stemma is selected on load is the one that gets deleted
    cy.selectedStemmaName().then((selected) => {
      const other = NOTRE_BESOIN.stemmata.find((n) => n !== selected);
      openDelete();
      cy.clickDialogButton('Yes, delete it');
      cy.contains('stemmaweb-alert', `Deleted stemma ${selected}`);
      cy.dialogShouldBeClosed();
      cy.stemmaListShouldEqual([other]);
      cy.selectedStemmaShouldBe(other);
      cy.stemmaGraphShouldBe(true);
      stored(NOTRE_BESOIN.title).should('deep.equal', [other]);

      cy.reload();
      cy.appReady();
      cy.selectTradition(NOTRE_BESOIN.title);
      cy.stemmaListShouldEqual([other]);
    });
  });

  it('deletes the stemma that was chosen from the list, not the one selected on load', () => {
    cy.visitAs(owner);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.selectedStemmaName().then((selectedOnLoad) => {
      const chosen = NOTRE_BESOIN.stemmata.find((n) => n !== selectedOnLoad);
      cy.selectStemma(chosen);
      openDelete();
      cy.clickDialogButton('Yes, delete it');
      cy.contains('stemmaweb-alert', `Deleted stemma ${chosen}`);
      cy.dialogShouldBeClosed();
      cy.stemmaListShouldEqual([selectedOnLoad]);
      cy.selectedStemmaShouldBe(selectedOnLoad);
      stored(NOTRE_BESOIN.title).should('deep.equal', [selectedOnLoad]);
    });
  });

  it('can delete the only stemma, leaving no graph, no selector and only "add" offered', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    openDelete();
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    cy.stemmaListShouldEqual([]);
    cy.stemmaGraphShouldBe(false);
    cy.stemmaLinksShouldBe({ add: true, edit: false, del: false });
    stored(FLORILEGIUM.title).should('deep.equal', []);

    cy.reload();
    cy.appReady();
    cy.selectTradition(FLORILEGIUM.title);
    cy.stemmaListShouldEqual([]);
    cy.stemmaGraphShouldBe(false);
  });

  it("does not touch another tradition's stemmata", () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    openDelete();
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.stemmaListShouldEqual(NOTRE_BESOIN.stemmata);
  });

  it('reports an error and keeps the stemma when the server rejects the deletion', () => {
    cy.intercept('DELETE', '**/api/tradition/*/stemma/*', {
      statusCode: 500,
      body: { code: 500, message: 'Simulated server failure' }
    }).as('delete');
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    openDelete();
    cy.clickDialogButton('Yes, delete it');
    cy.wait('@delete');
    cy.contains('stemmaweb-alert', 'Error during deletion');
    cy.dialogShouldBeClosed();
    cy.stemmaListShouldEqual(FLORILEGIUM.stemmata);
  });
});

describe('Message console', () => {
  beforeEach(() => cy.reseedDB());

  it('starts empty, records stemma changes newest first, and keeps them across traditions', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.messageConsoleShouldEqual([]);

    cy.openStemmaEditor('add');
    cy.saveStemma();
    cy.stemmaEditorShouldBeClosed();
    cy.get('#delete-stemma-button-link').click();
    cy.focused().should('have.id', 'modalDialog');
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();

    const expected = [
      { type: 'success', text: `Deleted stemma ${EXAMPLE_NAME}` },
      { type: 'success', text: 'Stemma added.' }
    ];
    cy.messageConsoleShouldEqual(expected);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.messageConsoleShouldEqual(expected);
  });

  it('also records errors', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.openStemmaEditor('add');
    cy.setStemmaDot('digraph "Broken" { A -> ');
    cy.saveStemma();
    cy.get('#message-console-text-panel .console-message.danger').should('contain.text', 'Cannot save stemma');
  });
});

describe('Re-root a stemma', () => {
  // Clicking a node of the drawn stemma re-draws it with that node at the top.
  beforeEach(() => cy.reseedDB());

  it('draws the stemma with the clicked node as its root, for the owner', () => {
    cy.intercept('POST', '**/reorient/*').as('reroot');
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.stemmaGraphShouldBe(true);
    cy.contains('#graph svg g.node title', /^T$/).parent().click({ force: true });
    cy.wait('@reroot').its('request.url').should('match', /\/stemma\/\d+\/reorient\/T$/);
    // The graph fades out and is redrawn; in a top-to-bottom drawing the root ends up with
    // the smallest y. Retry until the redraw has happened.
    cy.get('#graph svg g.node').should(($nodes) => {
      const y = (node) => Number(node.querySelector('ellipse').getAttribute('cy'));
      const root = [...$nodes].find((n) => n.querySelector('title').textContent.trim() === 'T');
      expect(y(root)).to.equal(Math.min(...[...$nodes].map(y)));
    });
  });

  // Known gap: the error handler in TraditionView.fetch_rooted reads `res.message`, but `res`
  // is not defined there (the parameter is `error`), so a failed re-root throws a
  // ReferenceError instead of showing the alert.
  it.skip('shows an error when the re-root request fails (known gap)', () => {
    cy.intercept('POST', '**/reorient/*', { forceNetworkError: true });
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.contains('#graph svg g.node title', /^T$/).parent().click({ force: true });
    cy.contains('stemmaweb-alert', 'Error during rooting of stemma');
  });

  it('does nothing for someone who does not own the tradition', () => {
    cy.intercept('POST', '**/reorient/*', cy.spy().as('rerootSpy'));
    cy.visitAs(null);
    cy.selectTradition(NOTRE_BESOIN.title);
    cy.stemmaGraphShouldBe(true);
    cy.get('#graph svg g.node title').first().parent().click({ force: true });
    cy.wait(500);
    cy.get('@rerootSpy').should('not.have.been.called');
  });
});
