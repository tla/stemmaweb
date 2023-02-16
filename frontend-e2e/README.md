# End-to-End Tests via Cypress

We are using [Cypress](https://www.cypress.io/) for end-to-end testing. The relevant files are located in
the [cypress](cypress) directory. The current setup makes it possible to develop and run tests locally as well as to
execute them in a CI environment.

## Local Development

### Prerequisites

Due to the fact that we are running E2E tests, you need to have a running instance of the frontend, middleware and
Stemmarest, the full stack essentially. Please refer to the main [README](../README.md#docker) to start the stack
locally using `docker-compose`.

### Working with Cypress

_The following instructions assume that you are working on a Unix-based system and your present working directory
relative to the repository root is [frontend-e2e](../frontend-e2e)._

Install the dependencies:

```bash
npm install
```

Open Cypress:

```bash
npm start
```

After running this command, a Cypress window should open automatically. You can now start to add new specifications or
modify and execute existing ones. You can verify that the local stack started by `docker-compose` is running properly
by executing the specification [availability.cy.js](cypress/e2e/availability.cy.js). This will verify that the required
components are in a healthy, reachable state.

You can find more details on how to write E2E tests with Cypress in
the [official documentation](https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test).
