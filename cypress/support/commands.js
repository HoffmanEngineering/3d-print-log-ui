Cypress.Commands.add('login', () => {
  cy.session('dev-bypass', () => {
    cy.visit('/');
  });
});

Cypress.Commands.add('createPrint', (title, options = {}) => {
  cy.intercept('POST', '/api/Prints/').as('_createPrint');
  cy.visit('/prints/new/edit');
  cy.get('#edit-print-title').type(title);
  cy.get('#edit-print-printer').click();
  if (options.printer) {
    cy.contains('mat-option', options.printer).click();
  } else {
    cy.get('mat-option').first().click();
  }
  cy.get('#edit-print-submit-btn').click();
  cy.wait('@_createPrint');
});

Cypress.Commands.add('openFilterPanel', () => {
  cy.get('#filter-panel').then(($panel) => {
    if (!$panel.hasClass('filter-panel--open')) {
      cy.get('[aria-controls="filter-panel"]').click();
    }
  });
  cy.get('#filter-panel').should('have.class', 'filter-panel--open');
});
