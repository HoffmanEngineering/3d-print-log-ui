describe('Color Pattern — form behavior', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/filament/new');
  });

  it('Solid: shows exactly 1 color picker, no add/remove buttons', () => {
    cy.contains('mat-button-toggle', 'Solid').click();
    cy.get('input[type="color"]').should('have.length', 1);
    cy.contains('button', 'Add color').should('not.exist');
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Gradient: shows 2 color pickers labeled Start / End, no add or remove buttons', () => {
    cy.contains('mat-button-toggle', 'Gradient').click();
    cy.get('input[type="color"]').should('have.length', 2);
    cy.contains('mat-label', 'Start').should('exist');
    cy.contains('mat-label', 'End').should('exist');
    cy.contains('button', 'Add color').should('not.exist');
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Multi: starts with 2 pickers and an add button, no remove at minimum', () => {
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.get('input[type="color"]').should('have.length', 2);
    cy.contains('button', 'Add color').should('be.visible');
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Multi: clicking add grows picker count to 3', () => {
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.contains('button', 'Add color').click();
    cy.get('input[type="color"]').should('have.length', 3);
    cy.get('button[aria-label="Remove color"]').should('be.visible');
  });

  it('Multi: clicking remove shrinks picker count back to 2 and hides remove', () => {
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.contains('button', 'Add color').click();
    cy.get('button[aria-label="Remove color"]').first().click();
    cy.get('input[type="color"]').should('have.length', 2);
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Rainbow: shows 5 preset buttons', () => {
    cy.contains('mat-button-toggle', 'Rainbow').click();
    ['Classic', 'Ocean', 'Sunset', 'Galaxy', 'Forest'].forEach((label) => {
      cy.contains('button', label).should('be.visible');
    });
  });

  it('Rainbow: applying Classic preset populates 6 color pickers', () => {
    cy.contains('mat-button-toggle', 'Rainbow').click();
    cy.contains('button', 'Classic').click();
    cy.get('input[type="color"]').should('have.length', 6);
  });

  it('Gradient and Rainbow show the gradient preview strip; Solid does not', () => {
    cy.contains('mat-button-toggle', 'Gradient').click();
    cy.get('[data-cy="gradient-preview"]').should('be.visible');

    cy.contains('mat-button-toggle', 'Rainbow').click();
    cy.get('[data-cy="gradient-preview"]').should('be.visible');

    cy.contains('mat-button-toggle', 'Solid').click();
    cy.get('[data-cy="gradient-preview"]').should('not.exist');
  });
});
