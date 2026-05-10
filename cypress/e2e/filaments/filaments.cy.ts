describe('Filaments', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should contain an "Add New Material" button', () => {
    cy.visit('/filament');

    cy.get('#add-new-filament')
      .should('exist')
      .should('contain.text', 'Add New Material');
  });

  it('should add a new material to the list', () => {
    cy.visit('/filament');

    const newFilamentName = 'New Test Filament - ' + new Date().getTime();

    cy.get('#add-new-filament').click();

    cy.get('#edit-filament-name').type(newFilamentName);

    cy.get('mat-select[formControlName="materialCategoryNickname"]')
      .click()
      .get('mat-option')
      .first()
      .click();

    cy.get('#edit-filament-material-type').type('PLA');

    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });

    cy.get('#edit-filament-submit-btn').click();

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.get('#filament-list-search-input').clear().type(newFilamentName);
    cy.wait('@getFilaments');

    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
  });

  it('should be able to edit an existing material', () => {
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments'); // initial page load

    cy.get('#filament-list-search-input').clear().type('New Test Filament');
    cy.wait('@getFilaments'); // debounced search request
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);

    const newFilamentName = 'Edit Test Filament - ' + new Date().getTime();

    cy.get('[data-cy-filament-row]')
      .first()
      .within(() => {
        cy.get('[data-cy-more-button]').click();
      });

    cy.get('[data-cy-edit-menu-option]').click();

    cy.get('#edit-filament-name').clear().type(newFilamentName);

    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@getFilaments'); // page load after navigating back from edit form

    cy.get('#filament-list-search-input').clear().type(newFilamentName);
    cy.wait('@getFilaments'); // debounced search request
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);

    cy.get('[data-cy-filament-row]')
      .first()
      .within(() => {
        cy.get('.mat-column-displayName')
          .invoke('text')
          .should('contain', newFilamentName);
      });
  });
});
