describe('Prints List', () => {
  beforeEach(() => {
    cy.login();
  });
  it('should contain a "Add New Print" button', () => {
    cy.visit('/prints');

    // const expectedSubtitle = 'Log and analyze your 3D Prints';
    // cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
    const expectedButtonText = 'Add New Print';

    cy.get('#add-new-print')
      .should('exist')
      .should('contain.text', expectedButtonText);
  });

  it('should display the list of saved 3d prints', () => {
    cy.visit('/prints');
    // const expectedSubtitle = 'Log and analyze your 3D Prints';
    // cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
    const expectedButtonText = 'Add New Print';

    cy.get('[cy-print-row]') // command
      .should('have.length.greaterThan', 0); // assertion
  });

  it('should add a new print to the list', () => {
    cy.visit('/prints');
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

  it('should be able to edit an existing print', () => {
    cy.visit('/prints');
    // const expectedSubtitle = 'Log and analyze your 3D Prints';
    // cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);

    // cy.get('body').then(($body) => {
    //   if ($body.find('#loginButton').length > 0) {
    //     //evaluates as true
    //     cy.get('#loginButton').click();
    //   }
    // });

    cy.get('[cy-print-row]').first().as('firstRow');

    cy.get('@firstRow').click();

    const newPrintTitle = 'Edit Test Print - ' + new Date().getTime();

    cy.get('button[data-cy-edit-btn]').click();

    cy.get('#edit-print-title').clear().type(newPrintTitle);

    cy.get('#edit-print-submit-btn').click();

    cy.get('@firstRow').within(() => {
      cy.get('.mat-column-title').invoke('text').should('equal', newPrintTitle);
    });
  });

  it('should be able to edit an existing print through the dropdown menu', () => {
    cy.visit('/prints');

    cy.get('[cy-print-row]').first().as('firstRow');

    cy.get('@firstRow').within(() => {
      cy.get('[data-cy-more-button]').click();
    });

    cy.get('[data-cy-edit-menu-option]').click();

    const newPrintTitle = 'Edit from Menu Test Print - ' + new Date().getTime();

    cy.get('#edit-print-title').clear().type(newPrintTitle);
    cy.get('#edit-print-status')
      .click()
      .get('mat-option')
      .contains('Success')
      .click();

    cy.get('#edit-print-submit-btn').click();

    cy.get('@firstRow').within(() => {
      cy.get('.mat-column-title').invoke('text').should('equal', newPrintTitle);
      cy.get('.mat-column-status').invoke('text').should('equal', 'Success');
    });
  });
  // it('should be able to add a new comment', () => {
  //   cy.get('[cy-print-row]').first().as('firstRow');

  //   cy.get('@firstRow')
  //     .get('.mat-column-commentCount')
  //     .invoke('text')
  //     .should((initialCommentCount) => {
  //       cy.get('@firstRow').click();

  //       const newComment = 'This is a new test comment!';

  //       cy.get('#add-comment-textarea').type(newComment);

  //       cy.get('#btn-add-print-comment').click();

  //       cy.get('[data-cy-close-btn]').click();

  //       cy.get('@firstRow').within(() => {
  //         cy.get('.mat-column-comment')
  //           .invoke('text')
  //           .should('equal', +initialCommentCount + 1);
  //       });
  //     });
  // });
});
