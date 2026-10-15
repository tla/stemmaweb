// Commands for the download menus (tradition and stemma). Files land in Cypress's downloads folder.

// What the page's own sanitize-filename does to a title, for the cases in the test data.
export const fileSafe = (name) => name.replace(/[/?<>\\:*|"]/g, '').replace(/[\u0000-\u001f\u0080-\u009f]/g, '').trim();

// Pick a format from the "Tradition" download menu.
Cypress.Commands.add('downloadTradition', (format) => {
  cy.get('#tradition-download-button').click();
  cy.get(`#download_trad_${format}`).click();
});

// Pick a format from the "Stemma" download menu.
Cypress.Commands.add('downloadStemma', (format) => {
  cy.get('#stemma_image_downloadbtn').click();
  cy.get(`#download_${format}`).click();
});

// A downloaded file's content as text; waits for it to arrive.
// (The file appears before it is fully written, so wait for it to have content.)
Cypress.Commands.add('downloadedText', (name) => {
  cy.readFile(`${Cypress.config('downloadsFolder')}/${name}`, 'utf8', { timeout: 20000 }).should('not.be.empty');
});

// A downloaded file's bytes as a Buffer; waits for it to arrive.
Cypress.Commands.add('downloadedBytes', (name) => {
  cy.readFile(`${Cypress.config('downloadsFolder')}/${name}`, null, { timeout: 20000 }).should((bytes) => expect(bytes.length).to.be.greaterThan(0));
});

// The names of everything downloaded so far.
Cypress.Commands.add('downloadedNames', () => {
  cy.task('listDownloads').then((files) => files.map((f) => f.name));
});

// Wait until at least `count` files have been downloaded, and yield them (name, size, text).
Cypress.Commands.add('waitForDownloads', (count = 1, attempts = 40) => {
  cy.task('listDownloads', null, { log: false }).then((files) => {
    if (files.length >= count && files.every((f) => f.size > 0)) return files;
    if (attempts <= 1) throw new Error(`expected ${count} downloaded file(s), found ${files.length}`);
    cy.wait(500, { log: false });
    return cy.waitForDownloads(count, attempts - 1);
  });
});
