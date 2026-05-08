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
    const ts = new Date().getTime();
    const printerA = 'Filter Printer A - ' + ts;
    const printerB = 'Filter Printer B - ' + ts;

    // Create Printer A
    cy.visit('/printers');
    cy.get('#add-new-printer').click();
    cy.get('#edit-printer-name').type(printerA);
    cy.get('#edit-printer-make').type('TestMake');
    cy.get('#edit-printer-model').type('ModelA');
    cy.get('#edit-printer-filament-diameter').clear().type('1.75');
    cy.get('#edit-printer-nozzle-diameter').clear().type('0.4');
    cy.get('#edit-printer-submit-btn').click();

    // Create Printer B
    cy.get('#add-new-printer').click();
    cy.get('#edit-printer-name').type(printerB);
    cy.get('#edit-printer-make').type('TestMake');
    cy.get('#edit-printer-model').type('ModelB');
    cy.get('#edit-printer-filament-diameter').clear().type('1.75');
    cy.get('#edit-printer-nozzle-diameter').clear().type('0.4');
    cy.get('#edit-printer-submit-btn').click();

    const printTitleA = 'Printer A Print - ' + ts;
    const printTitleB = 'Printer B Print - ' + ts;

    // Create a print using Printer A
    cy.intercept('POST', '/api/Prints/').as('createPrintA');
    cy.visit('/prints/new/edit');
    cy.get('#edit-print-title').type(printTitleA);
    cy.get('#edit-print-printer').click();
    cy.contains('mat-option', printerA).click();
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@createPrintA');

    // Create a print using Printer B
    cy.intercept('POST', '/api/Prints/').as('createPrintB');
    cy.visit('/prints/new/edit');
    cy.get('#edit-print-title').type(printTitleB);
    cy.get('#edit-print-printer').click();
    cy.contains('mat-option', printerB).click();
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@createPrintB');

    // Visit /prints and clear any leftover filters
    cy.visit('/prints');
    cy.get('#filter-panel').then(($panel) => {
      if (!$panel.hasClass('filter-panel--open')) {
        cy.get('[aria-controls="filter-panel"]').click();
      }
    });
    cy.get('#filter-panel').should('have.class', 'filter-panel--open');
    cy.findByRole('button', { name: /reset filters/i }).click();

    // Both prints are visible with no filter active
    cy.contains('[cy-print-row]', printTitleA).should('exist');
    cy.contains('[cy-print-row]', printTitleB).should('exist');

    // Select Printer A from the multi-select
    cy.findByRole('combobox', { name: /filter by printers/i }).click();
    cy.contains('mat-option', printerA).click();
    cy.get('body').type('{esc}');

    // All visible rows show Printer A; Printer B print is absent
    cy.get('[cy-print-row]').each(($row) => {
      cy.wrap($row)
        .find('.mat-column-printer')
        .should('contain.text', printerA);
    });
    cy.contains('[cy-print-row]', printTitleB).should('not.exist');

    // Badge shows 1 active filter
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    // Reset → Printer B print reappears, badge hidden
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.contains('[cy-print-row]', printTitleB).should('exist');
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('filament chip filter narrows results and chip removal restores them', () => {
    // TODO
  });
});
