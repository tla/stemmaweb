// Creating user with existing email address (user / admin) should fail.

describe("Creating a user with the existing test user's id should fail", function () {
  it.skip('under construction', function () {
    cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);

    // TODO:
    // if possible, get the example user from a variable, else hard-code 'user@example.org'
    // click and type to create a user with the same id.
    // The process should not succeed; there should be an error message

    // TODO:
    /* I could register a user x@y.org with a new password, log in and out, 
        register the same username again with the same new password.
        The old passwordd does not work any more, of course.
        
        I could delete the public tradition 'Notre besoin' when logged in as x@y.org.
        I could delete the last remaining tradition, even as a guest.
        */
  });
});
