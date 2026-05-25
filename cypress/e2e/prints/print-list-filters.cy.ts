describe('Print List Filters', () => {
  beforeEach(() => {
    cy.login();
  });

  it('filter panel opens, closes, and shows badge count', () => {
    cy.visit('/prints');

    // The panel auto-opens on viewports ≥ 600px wide; close it to test the
    // open transition from a known closed state.
    cy.get('#filter-panel').then(($panel) => {
      if ($panel.hasClass('filter-panel--open')) {
        cy.get('[aria-controls="filter-panel"]').click();
      }
    });
    cy.get('#filter-panel').should('not.have.class', 'filter-panel--open');

    cy.get('[aria-controls="filter-panel"]').click();
    cy.get('#filter-panel').should('have.class', 'filter-panel--open');

    cy.findByRole('combobox', { name: /status/i }).click();
    cy.findByRole('option', { name: 'Success' }).click();
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    cy.findByRole('combobox', { name: /filter by printers/i }).click();
    cy.get('mat-option').first().click();
    cy.get('body').type('{esc}');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '2');

    cy.get('[aria-controls="filter-panel"]').click();
    cy.get('#filter-panel').should('not.have.class', 'filter-panel--open');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '2');

    cy.get('[aria-controls="filter-panel"]').click();
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('search text narrows results', () => {
    const printTitle = 'Search Test Print - ' + new Date().getTime();

    cy.createPrint(printTitle);

    cy.visit('/prints');
    cy.get('[cy-print-row]').should('have.length.greaterThan', 1);

    cy.findByRole('textbox', { name: /search/i }).type(printTitle);
    cy.get('[cy-print-row]').should('have.length', 1);
    cy.get('[cy-print-row]').should('contain.text', printTitle);

    cy.findByRole('textbox', { name: /search/i }).clear();
    cy.get('[cy-print-row]').should('have.length.greaterThan', 1);
  });

  it('status filter narrows results and reset clears it', () => {
    const printTitle = 'Status Test Print - ' + new Date().getTime();

    cy.createPrint(printTitle);

    cy.visit('/prints');
    cy.openFilterPanel();
    cy.findByRole('button', { name: /reset filters/i }).click();

    cy.findByRole('combobox', { name: /status/i }).click();
    cy.findByRole('option', { name: 'Success' }).click();
    cy.get('[cy-print-row]').contains(printTitle).should('not.exist');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.contains('[cy-print-row]', printTitle).should('exist');
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('printer multi-select filter narrows results', () => {
    const ts = new Date().getTime();
    const printerA = 'Filter Printer A - ' + ts;
    const printerB = 'Filter Printer B - ' + ts;

    cy.visit('/printers');
    cy.get('#add-new-printer').click();
    cy.get('#edit-printer-name').type(printerA);
    cy.get('#edit-printer-make').type('TestMake');
    cy.get('#edit-printer-model').type('ModelA');
    cy.get('#edit-printer-filament-diameter').clear().type('1.75');
    cy.get('#edit-printer-nozzle-diameter').clear().type('0.4');
    cy.get('#edit-printer-submit-btn').click();

    cy.get('#add-new-printer').click();
    cy.get('#edit-printer-name').type(printerB);
    cy.get('#edit-printer-make').type('TestMake');
    cy.get('#edit-printer-model').type('ModelB');
    cy.get('#edit-printer-filament-diameter').clear().type('1.75');
    cy.get('#edit-printer-nozzle-diameter').clear().type('0.4');
    cy.get('#edit-printer-submit-btn').click();

    const printTitleA = 'Printer A Print - ' + ts;
    const printTitleB = 'Printer B Print - ' + ts;

    cy.createPrint(printTitleA, { printer: printerA });
    cy.createPrint(printTitleB, { printer: printerB });

    cy.visit('/prints');
    cy.openFilterPanel();
    cy.findByRole('button', { name: /reset filters/i }).click();

    cy.contains('[cy-print-row]', printTitleA).should('exist');
    cy.contains('[cy-print-row]', printTitleB).should('exist');

    cy.findByRole('combobox', { name: /filter by printers/i }).click();
    cy.contains('mat-option', printerA).click();
    cy.get('body').type('{esc}');

    cy.get('[cy-print-row]').each(($row) => {
      cy.wrap($row)
        .find('.mat-column-printer')
        .should('contain.text', printerA);
    });
    cy.contains('[cy-print-row]', printTitleB).should('not.exist');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');

    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.contains('[cy-print-row]', printTitleB).should('exist');
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
  });

  it('filament chip filter narrows results and chip removal restores them', () => {
    const filamentName = 'Filter Test Filament - ' + new Date().getTime();
    const printTitle = 'Filter Test Print - ' + new Date().getTime();

    cy.visit('/filament');
    cy.get('#add-new-filament').click();
    cy.get('#edit-filament-name').type(filamentName);
    cy.get('mat-select[formControlName="materialCategoryNickname"]')
      .click()
      .get('mat-option')
      .first()
      .click();
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.get('#edit-filament-total-weight').clear().type('1000');
    cy.get('#filament-inital-nominal-weight')
      .clear({ force: true })
      .type('800', { force: true });
    cy.get('#edit-filament-submit-btn').click();

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .find('.mat-column-title')
      .first()
      .click();
    cy.get('button[data-cy-edit-btn]').click();
    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').click();
    cy.wait('@getFilamentsModal');
    cy.get('#filament-list-search-input').clear().type(filamentName);
    cy.wait('@getFilamentsModal');
    cy.get('[data-cy-filament-row]').first().click();
    cy.get('#edit-print-actual-measure-type-0').click();
    cy.contains('mat-option', 'Weight').click();
    cy.get('#edit-print-actual-filament-used-gram-0').clear().type('50');
    cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint');

    cy.visit('/prints');
    cy.openFilterPanel();
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.contains('[cy-print-row]', printTitle).should('exist');

    cy.intercept('GET', '/api/Filaments*').as('getFilamentsFilter');
    cy.findByRole('button', { name: /filter by material/i }).click();
    cy.wait('@getFilamentsFilter');
    cy.get('#filament-list-search-input').clear().type(filamentName);
    cy.wait('@getFilamentsFilter');
    cy.get('[data-cy-filament-row]').first().click();
    cy.contains('button', /add.*filament/i).click();

    cy.get('mat-chip').should('exist');
    cy.get('.filter-toggle-btn .mat-badge-content').should('have.text', '1');
    cy.contains('[cy-print-row]', printTitle).should('exist');

    cy.findByRole('button', { name: /remove filament filter/i }).click();
    cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
    cy.contains('[cy-print-row]', printTitle).should('exist');
  });
});
