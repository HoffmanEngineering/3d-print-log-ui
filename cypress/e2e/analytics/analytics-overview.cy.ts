describe('Analytics overview', () => {
  const viewports: [string, number, number][] = [
    ['phone', 375, 667],
    ['tablet', 768, 1024],
    ['desktop', 1440, 900],
  ];

  beforeEach(() => {
    cy.login();
  });

  viewports.forEach(([name, width, height]) => {
    it(`renders without horizontal overflow on ${name}`, () => {
      cy.viewport(width, height);
      cy.visit('/analytics');

      cy.get('[data-testid="stat-value"]').should('have.length.at.least', 6);

      // The body must never scroll sideways; wide content scrolls inside its own container.
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(
          doc.documentElement.clientWidth + 1
        );
      });
    });
  });

  it('collapses filters behind a bottom sheet on phones', () => {
    cy.viewport(375, 667);
    cy.visit('/analytics');

    cy.get('[data-testid="mobile-filters-button"]')
      .should('be.visible')
      .click();
    cy.get('[data-testid="filter-sheet"]').should('be.visible');
  });

  it('shows filters inline on desktop', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');

    cy.get('[data-testid="mobile-filters-button"]').should('not.exist');
    cy.get('[data-testid="printer-select"]').should('be.visible');
  });

  it('persists the filter selection in the URL and restores it on reload', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');

    cy.get('[data-testid="date-range-select"]').click();
    cy.get('mat-option').contains('Last 7 days').click();

    cy.url().should('include', 'preset=last7');
    cy.reload();
    cy.get('[data-testid="date-range-select"]').should(
      'contain.text',
      'Last 7 days'
    );
  });

  it('clicking a donut slice opens the print list filtered by that status', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');

    cy.get('[data-testid="donut-legend-item"]').first().click();

    cy.url().should('include', '/prints');
    cy.url().should('include', 'filterByStatuses=');
    // Click-through must never leak a userId, which would turn it into a public query.
    cy.url().should('not.include', 'userId=');
  });
});
