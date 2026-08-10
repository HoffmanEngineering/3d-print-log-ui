describe('Analytics — export', () => {
  beforeEach(() => {
    cy.login();
  });

  // The formula-injection guarantee itself is unit-tested in chart-export.spec.ts, where it
  // can be asserted exhaustively. This spec only proves the menu is wired up and reachable.
  it('offers a CSV export on a chart', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');

    cy.get('app-chart-frame')
      .first()
      .find('[data-testid="chart-export"]')
      .click();
    cy.contains('Download CSV').should('exist');
    cy.contains('Download PNG').should('exist');
  });
});
