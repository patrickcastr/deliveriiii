describe('New Package with Item Template', () => {
  it('shows server validation errors then succeeds', () => {
    // Assumes dev servers running and seeded 'Standard Intake' published
    cy.visit('/admin');
  cy.get('[data-cy=new-package]').click();

    // Select item template
    cy.get('[data-cy=item-template]').select('Standard Intake');

    // Fill required base fields but omit required dynamic field to trigger 422
  cy.get('[data-cy=barcode]').type('PKG-E2E-1');
  cy.get('[data-cy=recipient-name]').type('Test User');
  cy.get('[data-cy=recipient-address]').type('123 Test St');

  cy.get('[data-cy=create-package]').click();
    cy.contains('Please fix the highlighted fields.').should('exist');

    // Now satisfy dynamic required field(s)
    cy.contains('Service level').parent().find('select').select('Standard');

  cy.get('[data-cy=create-package]').click();
    cy.contains('Please fix the highlighted fields.').should('not.exist');
  });
});
