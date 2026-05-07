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
    const printTitle = 'Status Test Print - ' + new Date().getTime();

    // Create a Pending print
    cy.intercept('POST', '/api/Prints/').as('createPrint');
    cy.visit('/prints/new/edit');
    cy.get('#edit-print-title').type(printTitle);
    cy.get('#edit-print-printer').click();
    cy.get('mat-option').first().click();
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@createPrint');

    // Visit /prints — ensure filter panel is open
    cy.visit('/prints');
    cy.get('#filter-panel').then(($panel) => {
      if (!$panel.hasClass('filter-panel--open')) {
        cy.get('[aria-controls="filter-panel"]').click();
      }
    });
    cy.get('#filter-panel').should('have.class', 'filter-panel--open');

    // Filter by Status = Success → Pending print is absent
    cy.findByRole('combobox', { name: /status/i }).click();
    cy.findByRole('option', { name: 'Success' }).click();
    cy.get('[cy-print-row]').contains(printTitle).should('not.exist');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    // Reset → Pending print reappears, badge hidden
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.contains('[cy-print-row]', printTitle).should('exist');
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('printer multi-select filter narrows results', () => {
    cy.visit('/prints');

    // Ensure filter panel is open
    cy.get('#filter-panel').then(($panel) => {
      if (!$panel.hasClass('filter-panel--open')) {
        cy.get('[aria-controls="filter-panel"]').click();
      }
    });
    cy.get('#filter-panel').should('have.class', 'filter-panel--open');

    // Open the printer multi-select and capture the first option's name
    cy.findByRole('combobox', { name: /filter by printers/i }).click();
    cy.get('mat-option')
      .first()
      .then(($opt) => {
        const printerName = $opt.text().trim();

        // Select that printer and close the panel
        cy.wrap($opt).click();
        cy.get('body').type('{esc}');

        // All visible rows show that printer's name in the printer column
        cy.get('[cy-print-row]').each(($row) => {
          cy.wrap($row)
            .find('.mat-column-printer')
            .should('contain.text', printerName);
        });
      });

    // Badge shows 1 active filter
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    // Reset → badge hidden
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('filament chip filter narrows results and chip removal restores them', () => {
    // TODO
  });
});
