// Running Stemweb from the dashboard. Stemweb itself is replaced by stemweb_mock, which answers
// per algorithm and never calls back, so what is testable is the dialog, the request it sends,
// and the status shown for the jobs the seed data attaches to three traditions.
import algorithms from '../fixtures/stemweb_algorithms.json';
import traditions from '../fixtures/test_traditions_mini.json';
import users from '../fixtures/users.json';

const owner = users.find(({ username }) => username === 'user@example.org');
const otherUser = users.find(({ username }) => username === 'benutzer@example.org');
const admin = users.find(({ role }) => role === 'admin');
const LEGEND = traditions.find(({ title }) => title.startsWith("Legend's")); // owned by user, no job
const api = () => `${Cypress.env('CY_STEMMAWEB_MIDDLEWARE_URL')}/api`;
const traditionId = (title) =>
  cy.request(`${api()}/traditions`).then(({ body }) => body.find((t) => t.name === title).id);

describe('Run Stemweb dialog', () => {
  beforeEach(() => {
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
  });

  it('lists the algorithms Stemweb offers, in order, with the first selected', () => {
    cy.openStemwebDialog();
    cy.get('select#algorithm-to-run_input option').should(($options) => {
      expect([...$options].map((o) => [o.textContent.trim(), o.value])).to.deep.equal(
        algorithms.map(({ text, value }) => [text, String(value)])
      );
    });
    cy.get('select#algorithm-to-run_input option:selected').should(($o) => expect($o.text().trim()).to.equal(algorithms[0].text));
  });

  algorithms.forEach(({ text, description }) => {
    it(`describes ${text} and shows only the arguments it takes`, () => {
      cy.openStemwebDialog();
      cy.get('select#algorithm-to-run_input').select(text);
      cy.get('#modalDialog form svg').click();
      cy.get('#algorithm-info-panel').should('be.visible');
      cy.get('#algorithm-info').should(($info) => expect($info.html()).to.equal(description));
      if (text === 'RHM') {
        cy.get('#algorithm-args #iterations_input').should('be.visible');
      } else {
        cy.get('#algorithm-args').children().should('not.exist');
      }
    });
  });

  it("offers each of the tradition's relation types as a checked box", () => {
    traditionId(LEGEND.title).then((id) => {
      cy.request(`${api()}/tradition/${id}/relationtypes`).then(({ body: types }) => {
        expect(types.length).to.be.greaterThan(0);
        cy.openStemwebDialog();
        cy.get('#algorithm-variants-panel input[type="checkbox"]').should(($boxes) => {
          expect([...$boxes].map((b) => b.name)).to.have.members(types.map((t) => `${t.name}_input`));
          expect([...$boxes].every((b) => b.checked)).to.equal(true);
        });
      });
    });
  });

  it('closes with Cancel, and when clicked outside, without sending anything', () => {
    cy.intercept('POST', '**/stemweb/algorithms/process/*', cy.spy().as('runSpy'));
    cy.openStemwebDialog();
    cy.clickDialogButton('Cancel');
    cy.dialogShouldBeClosed();
    cy.openStemwebDialog();
    cy.get('#modalDialog').click('left');
    cy.dialogShouldBeClosed();
    cy.get('@runSpy').should('not.have.been.called');
  });
});

describe('Starting a job', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/stemweb/algorithms/process/*').as('run');
    cy.visitAs(owner);
    cy.selectTradition(LEGEND.title);
  });

  algorithms.forEach(({ text, value }) => {
    it(`sends ${text} to Stemweb with the user, the tradition and all relation types, and says "Job added."`, () => {
      cy.openStemwebDialog();
      cy.get('select#algorithm-to-run_input').select(text);
      cy.runStemweb();
      cy.wait('@run').then(({ request }) => {
        expect(request.url).to.match(new RegExp(`/stemweb/algorithms/process/${value}$`));
        traditionId(LEGEND.title).then((id) => {
          expect(request.body).to.include({ userid: owner.username, tradid: id, return_path: '/result' });
          expect(request.body.data).to.equal(null);
          const sent = Object.fromEntries(request.body.parameters);
          ['collated_input', 'orthographic_input', 'spelling_input'].forEach((p) => expect(sent[p]).to.equal(true));
        });
      });
      cy.contains('stemmaweb-alert', 'Job added.');
      cy.dialogShouldBeClosed();
    });
  });

  it('sends the number of iterations typed for RHM', () => {
    cy.openStemwebDialog();
    cy.get('select#algorithm-to-run_input').select('RHM');
    cy.get('#iterations_input').type('7');
    cy.runStemweb();
    cy.wait('@run').its('request.body.parameters').then((parameters) => {
      expect(Object.fromEntries(parameters).iterations_input).to.equal('7');
    });
  });

  it('leaves out a relation type whose box was unticked', () => {
    cy.openStemwebDialog();
    cy.get('#algorithm-variants-panel input[name="orthographic_input"]').uncheck();
    cy.runStemweb();
    cy.wait('@run').its('request.body.parameters').then((parameters) => {
      const sent = Object.fromEntries(parameters);
      expect(sent.orthographic_input).to.equal(false);
      expect(sent.spelling_input).to.equal(true);
    });
  });

  it('reports an error when Stemweb fails (the dialog closes either way)', () => {
    cy.intercept('POST', '**/stemweb/algorithms/process/*', { statusCode: 500, body: { code: 500, message: 'Simulated' } });
    cy.openStemwebDialog();
    cy.runStemweb();
    cy.contains('stemmaweb-alert', 'Error');
    cy.dialogShouldBeClosed();
  });
});

describe('Job status', () => {
  // The seed attaches job 2 (running) to Florilegium, job 1 (done) to Notre besoin and job 3 (failed,
  // "Pretend we had an error here.") to the Arabic snippet. As admin, whichever is selected first
  // has no job, so every request the panel makes is for the tradition clicked.
  const CASES = [
    { start: 'Florilegium', job: 2, status: 'Running' },
    { start: 'Notre besoin', job: 1, status: 'Done' },
    { start: 'Arabic snippet', job: 3, status: 'Error', result: 'Pretend we had an error here.' }
  ];
  const noJob = traditions.filter((t) => !CASES.some(({ start }) => t.title.startsWith(start)));

  beforeEach(() => {
    cy.intercept('GET', '**/stemweb/algorithms/jobstatus/*').as('jobStatus');
    cy.visitAs(admin);
  });

  CASES.forEach(({ start, job, status, result }) => {
    it(`shows job ${job} (${status}) for ${start}`, () => {
      const t = traditions.find(({ title }) => title.startsWith(start));
      cy.selectTradition(t.title);
      cy.wait('@jobStatus');
      cy.jobStatusShouldBe({ job, status, result });
    });
  });

  noJob.forEach((t) => {
    it(`shows no job status for "${t.title}"`, () => {
      cy.selectTradition(t.title);
      cy.noJobStatus();
    });
  });

  it('shows the right status again after visiting other traditions', () => {
    [...CASES, ...CASES].reverse().forEach(({ start, job, status, result }) => {
      const t = traditions.find(({ title }) => title.startsWith(start));
      cy.selectTradition(t.title);
      cy.jobStatusShouldBe({ job, status, result });
      cy.selectTradition(noJob[0].title);
      cy.noJobStatus();
    });
  });

  // Known gaps in StemwebJobStatus: it prints the job's `result` as it is. A running job has none, so
  // the cell reads "undefined"; a finished job's result is an object, so the cell reads "[object Object]".
  [
    { start: 'Florilegium', what: 'a running job', shows: 'undefined' },
    { start: 'Notre besoin', what: 'a finished job', shows: '[object Object]' }
  ].forEach(({ start, what, shows }) => {
    it.skip(`shows something readable in the Result row for ${what} (known gap: reads "${shows}")`, () => {
      cy.selectTradition(traditions.find(({ title }) => title.startsWith(start)).title);
      cy.wait('@jobStatus');
      cy.get('stemweb-job-status #job_status tr').contains('td', /^Result$/).siblings('td').should(($cell) => {
        const shown = $cell.text().trim();
        expect(shown).not.to.equal('undefined');
        expect(shown).not.to.equal('[object Object]');
      });
    });
  });

  it('shows a guest the status of a public tradition', () => {
    cy.visitAs(null);
    cy.selectTradition(traditions.find(({ title }) => title.startsWith('Notre besoin')).title);
    cy.jobStatusShouldBe({ job: 1, status: 'Done' });
  });
});
