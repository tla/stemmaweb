// Downloading a tradition in each format of the "Tradition" menu, and the selected stemma from the
// "Stemma" menu. The files are checked by name and by what they contain.
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';
import { fileSafe } from '../support/downloads';

const owner = users.find(({ username }) => username === 'user@example.org');
const tradition = (start) => traditions.find((t) => t.title.startsWith(start));
const FLORILEGIUM = tradition('Florilegium'); // owned by user, 13 witnesses, one stemma
const NOTRE_BESOIN = tradition('Notre besoin'); // public, two stemmata
const JOHN = tradition('John verse'); // public, no stemma
const sorted = (witnesses) => [...witnesses].sort();

describe('Download a tradition', () => {
  beforeEach(() => cy.task('clearDownloads'));

  const open = (user, t) => {
    cy.visitAs(user);
    cy.selectTradition(t.title);
  };

  it('offers the seven formats of the menu', () => {
    open(owner, FLORILEGIUM);
    cy.get('#tradition-download-button').click();
    cy.get('#tradition-download-button').siblings('.dropdown-menu').find('a.dropdown-item').should(($items) => {
      expect([...$items].map((i) => i.id)).to.deep.equal([
        'download_trad_json', 'download_trad_csv', 'download_trad_tsv', 'download_trad_matrix',
        'download_trad_dot', 'download_trad_svg', 'download_trad_graphml'
      ]);
    });
  });

  it('downloads the collation as JSON, with every witness and the length of the alignment', () => {
    open(owner, FLORILEGIUM);
    cy.downloadTradition('json');
    // (Cypress parses a .json file for us)
    cy.downloadedText(`${fileSafe(FLORILEGIUM.title)}.json`).then((table) => {
      expect(table.alignment.map((a) => a.witness)).to.have.members(FLORILEGIUM.witnesses);
      expect(table.length).to.be.greaterThan(0);
      table.alignment.forEach((a) => expect(a.tokens).to.be.an('array'));
    });
  });

  it('downloads the collation as CSV and TSV, with the witnesses as the header row', () => {
    open(owner, FLORILEGIUM);
    cy.downloadTradition('csv');
    cy.downloadedText(`${fileSafe(FLORILEGIUM.title)}.csv`).then((text) => {
      const [header, ...rows] = text.trim().split('\n');
      expect(header.split(',')).to.have.members(FLORILEGIUM.witnesses);
      expect(rows.length).to.be.greaterThan(10);
    });
    cy.downloadTradition('tsv');
    cy.downloadedText(`${fileSafe(FLORILEGIUM.title)}.tsv`).then((text) => {
      const [header, ...rows] = text.trim().split('\n');
      expect(header.split('\t')).to.have.members(FLORILEGIUM.witnesses);
      expect(rows.length).to.be.greaterThan(10);
    });
  });

  it('downloads a Phylip character matrix (as .txt) with one row per witness', () => {
    open(owner, FLORILEGIUM);
    cy.downloadTradition('matrix');
    cy.downloadedText(`${fileSafe(FLORILEGIUM.title)}.txt`).then((text) => {
      const [first, ...rows] = text.trim().split('\n');
      expect(first.trim().split(/\s+/)[0]).to.equal(String(FLORILEGIUM.witnesses.length));
      expect(rows.map((r) => r.trim().split(/\s+/)[0])).to.have.members(FLORILEGIUM.witnesses);
    });
  });

  it('downloads the collation as Graphviz dot (as .gv)', () => {
    open(null, NOTRE_BESOIN);
    cy.downloadTradition('dot');
    cy.downloadedText(`${fileSafe(NOTRE_BESOIN.title)}.gv`).then((text) => {
      expect(text).to.match(/^digraph "Notre besoin" \{/);
      expect(text.trim().endsWith('}')).to.equal(true);
    });
  });

  it('downloads the native GraphML as a zip with the tradition and one file per section', () => {
    open(owner, FLORILEGIUM);
    cy.downloadTradition('graphml');
    cy.downloadedBytes(`${fileSafe(FLORILEGIUM.title)}.zip`).then((bytes) => {
      expect(Array.from(bytes.subarray(0, 4))).to.deep.equal([0x50, 0x4b, 0x03, 0x04]); // "PK"
      const text = Buffer.from(bytes).toString('latin1');
      expect(text).to.contain('tradition.xml');
      expect((text.match(/section-\d+\.xml/g) || []).length).to.be.greaterThan(0);
    });
  });

  // Known gap: the "SVG graph display" item requests GET /api/tradition/{id}/svg/, which Stemmarest
  // does not have (404), so nothing is downloaded.
  it.skip('downloads the collation graph as SVG (known gap: Stemmarest has no /svg endpoint)', () => {
    open(owner, FLORILEGIUM);
    cy.downloadTradition('svg');
    cy.downloadedText(`${fileSafe(FLORILEGIUM.title)}.svg`).then((text) => expect(text).to.contain('<svg'));
  });

  // Known gap in Stemmarest: the dot file names the graph with the tradition's title between
  // quotes without escaping the title's own, so a title with quotes gives invalid DOT.
  it.skip('names the graph in the dot file validly when the title contains quotes (known gap: Stemmarest does not escape them)', () => {
    open(owner, FLORILEGIUM);
    cy.downloadTradition('dot');
    cy.downloadedText(`${fileSafe(FLORILEGIUM.title)}.gv`).then((text) => {
      expect(text.split('\n')[0]).to.match(/^digraph "Florilegium \\"Coislinianum B\\"" \{/);
    });
  });

  // The name the page gives the file is `<title>.csv`, but this container's browser saves a download
  // whose name has non-ASCII characters as plain "download", so only the content can be checked here.
  it('downloads a tradition whose title is not ASCII', () => {
    const matthew = tradition('Ժամանակագրութիւն');
    cy.visitAs(users.find(({ username }) => username === 'benutzer@example.org'));
    cy.selectTradition(matthew.title);
    cy.downloadTradition('csv');
    cy.waitForDownloads(1).then(([file]) => {
      // the columns are the witnesses' layers: "A", "D (a.c.)", ...
      const columns = file.text.trim().split('\n')[0].split(',');
      expect(columns.length).to.be.greaterThan(1);
      columns.forEach((column) => expect(matthew.witnesses).to.include(column.replace(/ \(a\.c\.\)$/, '')));
    });
  });

  it('lets a guest download a public tradition', () => {
    open(null, JOHN);
    cy.downloadTradition('csv');
    cy.downloadedText(`${fileSafe(JOHN.title)}.csv`).then((text) => {
      expect(text.trim().split('\n')[0].split(',')).to.have.members(JOHN.witnesses);
    });
  });

  it('shows an error and downloads nothing when the server fails', () => {
    cy.intercept('GET', '**/api/tradition/*/csv/', { statusCode: 500, body: { code: 500, message: 'Simulated' } }).as('csv');
    open(owner, FLORILEGIUM);
    cy.downloadTradition('csv');
    cy.wait('@csv');
    cy.contains('stemmaweb-alert', 'Error retrieving tradition data');
    cy.downloadedNames().should('have.length', 0);
  });
});

describe('Download a stemma', () => {
  beforeEach(() => cy.task('clearDownloads'));

  const stemmaFile = (t, stemmaName, ext) => `${fileSafe(t.title)}_${fileSafe(stemmaName)}.${ext}`;

  it('downloads the stemma as dot, exactly as stored', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.stemmaGraphShouldBe(true);
    cy.storedStemmata(FLORILEGIUM.title).then(([stored]) => {
      cy.downloadStemma('dot');
      cy.downloadedText(stemmaFile(FLORILEGIUM, stored.name, 'dot')).should('equal', stored.dot);
    });
  });

  it('downloads the drawn stemma as SVG, with every node', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.stemmaGraphShouldBe(true);
    cy.stemmaNodes().then((nodes) => {
      cy.downloadStemma('svg');
      cy.downloadedText(stemmaFile(FLORILEGIUM, FLORILEGIUM.stemmata[0], 'svg')).then((text) => {
        expect(text).to.match(/^\s*<svg/);
        nodes.forEach((n) => expect(text).to.contain(`<title>${n}</title>`));
      });
    });
  });

  it('downloads the drawn stemma as a PNG image', () => {
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.stemmaGraphShouldBe(true);
    cy.downloadStemma('png');
    cy.downloadedBytes(stemmaFile(FLORILEGIUM, FLORILEGIUM.stemmata[0], 'png')).then((bytes) => {
      expect(Array.from(bytes.subarray(0, 8))).to.deep.equal([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(bytes.length).to.be.greaterThan(1000);
    });
  });

  it('downloads the stemma that is selected, under its own name', () => {
    cy.visitAs(null);
    cy.selectTradition(NOTRE_BESOIN.title);
    NOTRE_BESOIN.stemmata.forEach((name) => {
      cy.selectStemma(name);
      cy.storedStemmata(NOTRE_BESOIN.title).then((all) => {
        const stored = all.find((s) => s.name === name);
        cy.downloadStemma('dot');
        cy.downloadedText(stemmaFile(NOTRE_BESOIN, name, 'dot')).should('equal', stored.dot);
      });
    });
  });

  it('is disabled for a tradition without a stemma, and downloads nothing', () => {
    cy.visitAs(null);
    cy.selectTradition(JOHN.title);
    cy.get('#stemma_image_downloadbtn').should('have.class', 'disabled').and('have.css', 'pointer-events', 'none');
    cy.downloadedNames().should('have.length', 0);
  });

  it('is enabled again once a stemma exists, and disabled when the last one is deleted', () => {
    cy.reseedDB();
    cy.visitAs(owner);
    cy.selectTradition(FLORILEGIUM.title);
    cy.get('#stemma_image_downloadbtn').should('not.have.class', 'disabled');
    cy.get('#delete-stemma-button-link').click();
    cy.focused().should('have.id', 'modalDialog');
    cy.clickDialogButton('Yes, delete it');
    cy.dialogShouldBeClosed();
    cy.get('#stemma_image_downloadbtn').should('have.class', 'disabled');
  });
});
