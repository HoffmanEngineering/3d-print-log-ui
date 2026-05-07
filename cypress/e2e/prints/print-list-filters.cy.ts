describe('Print List Filters', () => {
  beforeEach(() => {
    cy.login();
  });

  it('filter panel opens, closes, and shows badge count', () => {
    cy.visit('/prints');

    // The panel auto-opens on viewports ≥ 600px wide; close it so we can
    // test the open transition from a known closed state.
    cy.get('#filter-panel').then(($panel) => {
      if ($panel.hasClass('filter-panel--open')) {
        cy.get('[aria-controls="filter-panel"]').click();
      }
    });
    cy.get('#filter-panel').should('not.have.class', 'filter-panel--open');

    // Open the filter panel
    cy.get('[aria-controls="filter-panel"]').click();
    cy.get('#filter-panel').should('have.class', 'filter-panel--open');

    // Select Status = Success → badge shows 1
    cy.findByRole('combobox', { name: /status/i }).click();
    cy.findByRole('option', { name: 'Success' }).click();
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    // Select first printer from the multi-select → badge shows 2
    cy.findByRole('combobox', { name: /filter by printers/i }).click();
    cy.get('mat-option').first().click();
    cy.get('body').type('{esc}');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '2');

    // Close panel — badge still shows 2
    cy.get('[aria-controls="filter-panel"]').click();
    cy.get('#filter-panel').should('not.have.class', 'filter-panel--open');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '2');

    // Reopen and reset → badge disappears (host gets mat-badge-hidden)
    cy.get('[aria-controls="filter-panel"]').click();
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('search text narrows results', () => {
    const printTitle = 'Search Test Print - ' + new Date().getTime();

    // Create a print with a unique title
    cy.intercept('POST', '/api/Prints/').as('createPrint');
    cy.visit('/prints/new/edit');
    cy.get('#edit-print-title').type(printTitle);
    cy.get('#edit-print-printer').click();
    cy.get('mat-option').first().click();
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@createPrint');

    // Visit /prints — multiple rows exist
    cy.visit('/prints');
    cy.get('[cy-print-row]').should('have.length.greaterThan', 1);

    // Type unique title → exactly one row, containing that title
    cy.findByRole('textbox', { name: /search/i }).type(printTitle);
    cy.get('[cy-print-row]').should('have.length', 1);
    cy.get('[cy-print-row]').should('contain.text', printTitle);

    // Clear search → multiple rows visible again
    cy.findByRole('textbox', { name: /search/i }).clear();
    cy.get('[cy-print-row]').should('have.length.greaterThan', 1);
  });

  it('status filter narrows results and reset clears it', () => {
    // TODO
  });

  it('printer multi-select filter narrows results', () => {
    // TODO
  });

  it('filament chip filter narrows results and chip removal restores them', () => {
    // TODO
  });
});
