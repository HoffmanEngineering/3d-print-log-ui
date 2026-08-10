describe('Print List Empty States', () => {
  beforeEach(() => {
    cy.login();
  });

  it('shows the filtered empty state for a search that matches nothing', () => {
    const noMatch = 'zzz-no-such-print-' + new Date().getTime();

    cy.visit('/prints');
    cy.get('[cy-print-row]').should('have.length.greaterThan', 0);

    cy.findByRole('textbox', { name: /search/i }).type(noMatch);

    cy.get('app-print-empty-state').should('be.visible');
    cy.contains('No prints match your filters').should('be.visible');
    cy.contains(`a search for "${noMatch}"`).should('be.visible');

    // The first-run copy must not appear when the user is only filtered out.
    cy.contains('Log your first print').should('not.exist');
  });

  it('mentions the number of active filters alongside the search term', () => {
    const noMatch = 'zzz-no-such-print-' + new Date().getTime();

    cy.visit('/prints');

    cy.get('#filter-panel').then(($panel) => {
      if (!$panel.hasClass('filter-panel--open')) {
        cy.get('[aria-controls="filter-panel"]').click();
      }
    });

    cy.findByRole('combobox', { name: /status/i }).click();
    cy.findByRole('option', { name: 'Success' }).click();

    cy.findByRole('textbox', { name: /search/i }).type(noMatch);

    cy.contains('1 active filter').should('be.visible');
    cy.contains(`a search for "${noMatch}"`).should('be.visible');
  });

  it('clear filters from the empty state restores the full list', () => {
    const noMatch = 'zzz-no-such-print-' + new Date().getTime();

    cy.visit('/prints');
    cy.findByRole('textbox', { name: /search/i }).type(noMatch);

    cy.get('[data-cy="empty-state-clear-filters"]')
      .should('be.visible')
      .click();

    cy.get('app-print-empty-state').should('not.exist');
    cy.get('[cy-print-row]').should('have.length.greaterThan', 0);
    cy.findByRole('textbox', { name: /search/i }).should('have.value', '');
  });

  it('announces the empty state politely', () => {
    const noMatch = 'zzz-no-such-print-' + new Date().getTime();

    cy.visit('/prints');
    cy.findByRole('textbox', { name: /search/i }).type(noMatch);

    cy.get('app-empty-state').should('have.attr', 'role', 'status');
  });
});
