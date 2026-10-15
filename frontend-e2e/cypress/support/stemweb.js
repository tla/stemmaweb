// Commands for the "Run Stemweb" dialog and the job status panel.

// Open the "Generate a Stemweb tree" dialog and wait for it to settle.
Cypress.Commands.add('openStemwebDialog', () => {
  cy.get('#run-stemweb-button').click();
  cy.get('#modalDialog').should('be.visible');
  cy.focused().should('have.id', 'modalDialog');
  cy.get('#modalDialogLabel').should('have.text', 'Generate a Stemweb tree');
});

// Press "Run" in the dialog.
Cypress.Commands.add('runStemweb', () => {
  cy.contains('#modalDialog .modal-footer button', 'Run').click();
});

// The job status panel shows these rows ("Job", "Status", "Result"); omit `result` to leave it unchecked.
Cypress.Commands.add('jobStatusShouldBe', ({ job, status, result }) => {
  cy.get('stemweb-job-status #job_status').should(($body) => {
    const rows = Object.fromEntries(
      [...$body[0].querySelectorAll('tr')].map((tr) => {
        const [label, value] = [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim());
        return [label, value];
      })
    );
    expect(rows.Job).to.equal(String(job));
    expect(rows.Status).to.contain(status);
    if (result !== undefined) expect(rows.Result).to.contain(result);
  });
});

Cypress.Commands.add('noJobStatus', () => {
  cy.get('stemweb-job-status #job_status').should('not.exist');
});
