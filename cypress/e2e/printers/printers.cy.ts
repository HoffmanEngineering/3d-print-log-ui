describe('Prints List', () => {
  beforeEach(() => {
    cy.login();
  });
  it('should contain a "Add New Printer" button', () => {
    cy.visit('/printers');
    const expectedButtonText = 'Add New Printer';

    cy.get('#add-new-printer')
      .should('exist')
      .should('contain.text', expectedButtonText);
  });

  it('should display the list of saved printers', () => {
    cy.visit('/printers');
    cy.get('[data-cy-printer-row]') // command
      .should('have.length.greaterThan', 0); // assertion
  });

  it('should add a new printer to the list', () => {
    cy.visit('/printers');

    const newPrinterTitle = 'New Test Printer - ' + new Date().getTime();
    const newMake = 'TestMake';
    const newModel = 'TestModel';

    cy.get('.mat-mdc-paginator-range-label')
      .invoke('text')
      .then((numPrintersBefore) => {
        cy.get('#add-new-printer').click();

        cy.get('#edit-printer-name').type(newPrinterTitle);
        cy.get('#edit-printer-make').type(newMake);
        cy.get('#edit-printer-model').type(newModel);
        cy.get('#edit-printer-filament-diameter').clear().type('1.75');
        cy.get('#edit-printer-nozzle-diameter').clear().type('0.4');

        cy.get('#edit-printer-submit-btn').click();

        cy.get('.mat-mdc-paginator-range-label') // command
          .invoke('text')
          .should((text) => {
            const parsePagination = (textToParse: string) =>
              text.split('of')[1].trim();
            expect(parsePagination(text)).to.equal(
              parsePagination(numPrintersBefore)
            );
          }); // assertion
      });
  });

  it('should be able to edit an existing print', () => {
    cy.visit('/printers');

    cy.intercept('GET', '/api/printers/*').as('getPrinters');

    cy.get('#printer-list-search-input').clear().type('New Test Printer');
    cy.wait('@getPrinters');

    cy.get('[data-cy-printer-row]').first().click();

    const newPrinterName = 'Edit Test Printer - ' + new Date().getTime();

    cy.get('#edit-printer-name').clear().type(newPrinterName);

    cy.get('#edit-printer-submit-btn').click();

    cy.get('#printer-list-search-input').clear().type(newPrinterName);

    cy.wait('@getPrinters').wait(500);

    cy.get('[data-cy-printer-row]')
      .first()
      .within(() => {
        cy.get('.mat-column-name')
          .invoke('text')
          .should('contain', newPrinterName);
      });
  });
});
