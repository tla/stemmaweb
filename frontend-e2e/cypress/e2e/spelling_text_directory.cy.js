describe("The spelling of 'Text directory' should be corrected", function(){
    it('passes', function(){
      cy.visit(`${Cypress.env('CY_STEMMAWEB_FRONTEND_URL')}/`);
      cy.get('h6').contains('Text directory') // and not 'Text dirtectory'
      })
  })