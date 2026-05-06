describe('Projects', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should navigate to new project form from the dropdown', () => {
    cy.visit('/prints');
    cy.get('#menu').click();
    cy.get('[data-cy="add-project-menu-item"]').click();
    cy.url().should('include', '/projects/new');
    cy.get('[data-testid="name-input"]').should('be.visible');
  });

  it('should add a new project', () => {
    cy.visit('/projects/new');
    cy.intercept('POST', '/api/Projects').as('createProject');

    const projectName = 'New Test Project - ' + new Date().getTime();
    cy.get('[data-testid="name-input"]').type(projectName);
    cy.get('[data-cy="project-save-btn"]').click();

    cy.wait('@createProject');
    cy.url().should('not.include', '/projects/new');
    cy.get('[data-cy="project-name-title"]').should(
      'contain.text',
      projectName
    );
  });

  it('should edit an existing project', () => {
    cy.visit('/projects/new');
    cy.intercept('POST', '/api/Projects').as('createProject');

    const initialName = 'Edit Test Project - ' + new Date().getTime();
    cy.get('[data-testid="name-input"]').type(initialName);
    cy.get('[data-cy="project-save-btn"]').click();
    cy.wait('@createProject');
    cy.url().should('not.include', '/projects/new');

    cy.intercept('PUT', '/api/Projects/*').as('updateProject');
    cy.get('[data-testid="edit-button"]').click();

    const updatedName = 'Updated Test Project - ' + new Date().getTime();
    cy.get('[data-testid="name-input"]').clear().type(updatedName);
    cy.get('[data-cy="project-save-btn"]').click();

    cy.wait('@updateProject');
    cy.get('[data-cy="project-name-title"]').should(
      'contain.text',
      updatedName
    );
  });
});
