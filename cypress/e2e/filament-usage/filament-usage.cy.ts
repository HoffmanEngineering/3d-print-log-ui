describe('Filament Usage', () => {
  beforeEach(() => {
    cy.login();
  });

  // The new-print form may auto-fill filament entries from the printer's loaded filament,
  // and legacy prints may produce an "Other" entry from old filamentType/filamentUsageMg
  // fields. Both kinds have EMPTY_GUID ids (unsaved) so deleting them requires no dialog.
  // Call this after navigating to the edit form to clear any pre-existing entries before
  // adding test-specific ones.
  const clearPrefilledFilamentEntries = () => {
    // Wait for the form to finish rendering before counting entries.
    cy.get('#add-new-filament-usage-btn').should('exist');
    cy.get('body').then(($body) => {
      const count = $body.find('[data-cy="delete-filament-btn"]').length;
      for (let i = 0; i < count; i++) {
        cy.get('[data-cy="delete-filament-btn"]').first().click();
      }
    });
  };

  it('should track remaining weight when filament is used in a print', () => {
    const ts = new Date().getTime();
    const filamentName = 'Weight Test Filament - ' + ts;
    const printTitle = 'Weight Test Print - ' + ts;

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
    cy.get('#edit-filament-total-weight').clear().type('1250');
    cy.get('#filament-inital-nominal-weight')
      .clear({ force: true })
      .type('1000', { force: true });
    cy.get('#edit-filament-submit-btn').click();

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.visit(`/prints/${printId}/edit`);
      });
    clearPrefilledFilamentEntries();
    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').click();
    cy.wait('@getFilamentsModal');
    cy.get('#filament-list-search-input').clear().type(filamentName);
    cy.wait('@getFilamentsModal');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();
    cy.get('#edit-print-actual-measure-type-0').click();
    cy.contains('mat-option', 'Weight').click();
    cy.get('#edit-print-actual-filament-used-gram-0').clear().type('100');
    cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(filamentName);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]')
      .first()
      .within(() => {
        cy.get('.mat-column-filamentRemaining').should('contain.text', '900');
      });
  });

  it('should allow adding multiple filament records to a print', () => {
    const printTitle = 'Multi Filament Print - ' + new Date().getTime();

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.wrap(printId).as('printId');
        cy.visit(`/prints/${printId}/edit`);
      });
    clearPrefilledFilamentEntries();
    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal1');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').first().click();
    cy.wait('@getFilamentsModal1');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();
    cy.get('#edit-print-actual-measure-type-0').click();
    cy.contains('mat-option', 'Weight').click();
    cy.get('#edit-print-actual-filament-used-gram-0').clear().type('50');

    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal2');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').last().click();
    cy.wait('@getFilamentsModal2');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();
    cy.get('#edit-print-actual-measure-type-1').click();
    cy.contains('mat-option', 'Weight').click();
    cy.get('#edit-print-actual-filament-used-gram-1').clear().type('30');

    cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint');

    cy.get('@printId').then((printId) => {
      cy.visit(`/prints/${printId}/edit`);
    });
    cy.get('.filament-entry-card').should('have.length', 2);
  });

  it('should allow editing filament usage amount', () => {
    const printTitle = 'Edit Usage Print - ' + new Date().getTime();

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.wrap(printId).as('printId');
        cy.visit(`/prints/${printId}/edit`);
      });
    clearPrefilledFilamentEntries();
    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').click();
    cy.wait('@getFilamentsModal');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();
    cy.get('#edit-print-actual-measure-type-0').click();
    cy.contains('mat-option', 'Weight').click();
    cy.get('#edit-print-actual-filament-used-gram-0').clear().type('50');
    cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint');

    cy.get('@printId').then((printId) => {
      cy.visit(`/prints/${printId}/edit`);
    });
    cy.get('#edit-print-actual-filament-used-gram-0').clear().type('75');
    cy.intercept('PUT', '/api/Prints/*').as('updatePrint2');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint2');

    cy.get('@printId').then((printId) => {
      cy.visit(`/prints/${printId}/edit`);
    });
    cy.get('#edit-print-actual-filament-used-gram-0').should(
      'have.value',
      '75'
    );
  });

  it('should allow removing filament usage from a print', () => {
    const printTitle = 'Remove Usage Print - ' + new Date().getTime();

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.wrap(printId).as('printId');
        cy.visit(`/prints/${printId}/edit`);
      });
    clearPrefilledFilamentEntries();
    cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').click();
    cy.wait('@getFilamentsModal');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();
    cy.get('#edit-print-actual-measure-type-0').click();
    cy.contains('mat-option', 'Weight').click();
    cy.get('#edit-print-actual-filament-used-gram-0').clear().type('50');
    cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint');

    cy.get('@printId').then((printId) => {
      cy.visit(`/prints/${printId}/edit`);
    });
    cy.get('[data-cy="delete-filament-btn"]').click();
    cy.get('mat-dialog-container').contains('button', 'Delete').click();
    cy.get('.filament-entry-card').should('not.exist');
    cy.intercept('PUT', '/api/Prints/*').as('updatePrint2');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint2');

    cy.get('@printId').then((printId) => {
      cy.visit(`/prints/${printId}/edit`);
    });
    cy.get('.filament-entry-card').should('not.exist');
  });
});
