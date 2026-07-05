describe('Spool weight adjustment calculator', () => {
  beforeEach(() => {
    cy.login();
  });

  // Fills the create form for a weight-based material with initial total and
  // nominal weights (so a spool weight is derivable and remaining is known),
  // then saves and yields the created filament id.
  function createWeighableFilament(name: string): Cypress.Chainable<string> {
    cy.visit('/filament');
    cy.get('#add-new-filament').click();

    cy.get('#edit-filament-name').type(name);

    cy.get('mat-select[formControlName="materialCategoryNickname"]')
      .click()
      .get('mat-option')
      .first()
      .click();

    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.get('#edit-filament-total-weight')
      .clear({ force: true })
      .type('1150', { force: true });
    cy.get('#filament-inital-nominal-weight')
      .clear({ force: true })
      .type('1000', { force: true });

    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.get('#edit-filament-submit-btn').click();

    return cy
      .wait('@createFilament')
      .then((interception) => interception.response!.body.id as string);
  }

  it('calculates and adds an adjustment from a measured spool weight', () => {
    const name = 'Spool Calc Filament - ' + new Date().getTime();

    createWeighableFilament(name).then((filamentId) => {
      // Re-open the saved material: form is pristine and filamentRemaining is
      // computed by the API, so the calculator is available.
      cy.visit(`/filament/${filamentId}`);

      cy.get('#spool-calc-button')
        .should('be.visible')
        .should('not.be.disabled')
        .click();

      // Enter the measured total spool weight.
      cy.get('#spool-calc-measured-weight').type('450');

      // measured remaining = 450 - 150 (spool) = 300 g;
      // adjustment = 300 - 1000 (tracked remaining) = -700 g.
      cy.get('.calc-adjustment').should('contain.text', '-700');

      cy.get('mat-dialog-container')
        .contains('button', 'Add Adjustment')
        .click();

      // A new weight adjustment row is appended with the computed amount.
      cy.get('#filament-adjustment-used-gram-0').should('have.value', '-700');

      // Persist and confirm it round-trips.
      cy.intercept('PUT', `/api/Filaments/${filamentId}`).as('updateFilament');
      cy.get('#edit-filament-submit-btn').click();
      cy.wait('@updateFilament');

      cy.visit(`/filament/${filamentId}`);
      cy.get('#filament-adjustment-used-gram-0').should('have.value', '-700');
    });
  });

  it('hides the calculator on a new material and disables it while the form has unsaved edits', () => {
    const name = 'Spool Calc Gate - ' + new Date().getTime();

    // A brand-new (unsaved) material has no remaining to reconcile against.
    cy.visit('/filament');
    cy.get('#add-new-filament').click();
    cy.get('#spool-calc-button').should('not.exist');

    createWeighableFilament(name).then((filamentId) => {
      cy.visit(`/filament/${filamentId}`);

      // Pristine, saved, spool weight resolvable -> enabled.
      cy.get('#spool-calc-button')
        .should('be.visible')
        .should('not.be.disabled');

      // Any unsaved edit disables it so the calculation stays authoritative.
      cy.get('#edit-filament-name').type(' edited');
      cy.get('#spool-calc-button').should('be.disabled');
    });
  });
});
