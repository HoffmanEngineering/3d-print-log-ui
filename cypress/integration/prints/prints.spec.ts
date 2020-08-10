describe('Prints List', () => {
  beforeEach(() => {
    cy.login('/prints');
  });
  it('should contain a "Add New Print" button', () => {
    // const expectedSubtitle = 'Log and analyze your 3D Prints';
    // cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
    const expectedButtonText = 'Add New Print';

    cy.get('#add-new-print')
      .should('exist')
      .should('contain.text', expectedButtonText);
  });

  it('should display the list of saved 3d prints', () => {
    // const expectedSubtitle = 'Log and analyze your 3D Prints';
    // cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
    const expectedButtonText = 'Add New Print';

    cy.get('[cy-print-row]') // command
      .should('have.length.greaterThan', 0); // assertion
  });

  it('should add a new print to the list', () => {
    // const expectedSubtitle = 'Log and analyze your 3D Prints';
    // cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
    const newPrintTitle = 'New Test Print - ' + new Date().getTime();

    cy.get('.mat-paginator-range-label')
      .invoke('text')
      .then((numPrintsBefore) => {
        cy.get('#add-new-print').click();

        cy.get('#edit-print-title').type(newPrintTitle);

        cy.get('#edit-print-printer')
          .click()
          .get('mat-option')
          .contains('Test Printer - (TEVO Tornado)')
          .click();
        // cy.get('.mat-option-text span')
        //     .contains('')
        //     .then(option => {
        //                 option[0].click();  // this is jquery click() not cypress click()
        //             });

        cy.get('#edit-print-submit-btn').click();

        cy.get('.mat-paginator-range-label') // command
          .invoke('text')
          .should((text) => {
            const parsePagination = (textToParse: string) =>
              text.split('of')[1].trim();
            expect(parsePagination(text)).to.equal(
              parsePagination(numPrintsBefore)
            );
          }); // assertion
      });
  });
});
