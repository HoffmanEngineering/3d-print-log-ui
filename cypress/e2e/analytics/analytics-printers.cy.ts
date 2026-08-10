describe('Analytics — Printers tab', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the card layout on a phone and the table on desktop', () => {
    cy.viewport(375, 667);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Printers').click();

    cy.get('.printer-comparison__card').should('exist');
    cy.get('table.printer-comparison__table').should('not.exist');

    cy.viewport(1440, 900);
    cy.get('table.printer-comparison__table').should('exist');
  });

  it('never lets the comparison table scroll the page body', () => {
    cy.viewport(375, 667);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Printers').click();

    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(
        doc.documentElement.clientWidth + 1
      );
    });
  });

  it('sorts the comparison table when a column header is clicked', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Printers').click();

    cy.contains('th button', 'Prints').click();
    cy.get('th button')
      .contains('Prints')
      .parents('th')
      .should('have.attr', 'aria-sort', 'ascending');
  });
});
