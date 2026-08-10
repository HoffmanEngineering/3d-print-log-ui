describe('Print List Bulk Actions', () => {
  beforeEach(() => {
    cy.login();
  });

  /**
   * Narrows the list to just the prints created by this test, so "select all on
   * this page" is a known, small set.
   */
  const showOnly = (prefix: string, expectedRows: number) => {
    cy.visit('/prints');
    cy.openFilterPanel();
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.findByRole('textbox', { name: /search/i }).type(prefix);
    cy.get('[cy-print-row]').should('have.length', expectedRows);
  };

  it('sets the status of several prints in one action', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Status ${ts}`;

    cy.createPrint(`${prefix} A`);
    cy.createPrint(`${prefix} B`);

    showOnly(prefix, 2);

    // The bar is contextual — nothing selected, nothing shown.
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');

    cy.intercept('PUT', '/api/Prints/*/status/*').as('updateStatus');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    cy.get('[data-cy-bulk-set-status]').click();
    cy.get('[data-cy-bulk-status="Success"]').click();

    // One request per print — there is no batch endpoint.
    cy.wait('@updateStatus');
    cy.wait('@updateStatus');

    // Everything succeeded, so the selection is emptied and the bar disappears.
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');

    cy.get('[cy-print-row]').should('have.length', 2);
    // Retryable: the list reloads in place once the batch finishes.
    cy.get('[cy-print-row] .mat-column-status')
      .filter(':contains("Success")')
      .should('have.length', 2);
  });

  it('selects a single row, then clears the selection', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Clear ${ts}`;

    cy.createPrint(`${prefix} A`);
    cy.createPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.get(`[data-cy-select-print="${printId}"]`).click();
        // The tick is driven by the native input's :checked state, so a handler
        // that cancels the click leaves the box blank while the count says 1.
        cy.get(
          `[data-cy-select-print="${printId}"] input[type="checkbox"]`
        ).should('be.checked');
      });

    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );

    cy.get('[data-cy-bulk-clear]').click();
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
  });

  it('keeps the selection when the result set changes', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Persist ${ts}`;

    cy.createPrint(`${prefix} A`);
    cy.createPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    // Narrowing the search re-runs the same code path as paging, sorting and
    // filtering. Both prints stay selected even though one is now off screen.
    cy.findByRole('textbox', { name: /search/i }).type(' A');
    cy.get('[cy-print-row]').should('have.length', 1);
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );
  });

  it('is operable from the keyboard', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Keyboard ${ts}`;

    cy.createPrint(`${prefix} A`);

    showOnly(prefix, 1);

    // Select-all reachable and togglable without a mouse.
    cy.get('[data-cy-select-all-prints] input').focus().type(' ');
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );

    cy.get('[data-cy-bulk-clear]').focus().type('{enter}');
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
  });

  it('confirms before deleting the selected prints', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Delete ${ts}`;

    cy.createPrint(`${prefix} A`);
    cy.createPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-delete]').click();

    // Cancelling leaves everything alone.
    cy.contains('mat-dialog-container, .mat-mdc-dialog-container', '2 prints')
      .should('exist')
      .within(() => {
        cy.contains('button', 'Cancel').click();
      });
    cy.get('[cy-print-row]').should('have.length', 2);
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    cy.intercept('DELETE', '/api/Prints/*').as('deletePrint');

    cy.get('[data-cy-bulk-delete]').click();
    cy.contains('.mat-mdc-dialog-container button', 'Delete').click();

    cy.wait('@deletePrint');
    cy.wait('@deletePrint');

    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
    cy.get('[cy-print-row]').should('have.length', 0);
  });
});
