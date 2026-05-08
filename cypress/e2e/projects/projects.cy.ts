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

  it('should assign a print to an existing project via the Print Edit page', () => {
    cy.visit('/projects/new');
    cy.intercept('POST', '/api/Projects').as('createProject');

    const projectName = 'Assign Test Project - ' + new Date().getTime();
    cy.get('[data-testid="name-input"]').type(projectName);
    cy.get('[data-cy="project-save-btn"]').click();
    cy.wait('@createProject');

    cy.visit('/prints');
    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.visit(`/prints/${printId}`);
      });
    cy.get('button[data-cy-edit-btn]').click();
    cy.get('[data-cy="project-selector-input"]').clear().type(projectName);
    cy.get('mat-option').contains(projectName).click();
    cy.get('#edit-print-submit-btn').click();

    cy.get('[cy-print-row]')
      .first()
      .within(() => {
        cy.get('[data-cy="project-chip"]').should('contain.text', projectName);
      });
  });

  it('should create a new project via the project selector and display its chip', () => {
    const newProjectName = 'Selector Test Project - ' + new Date().getTime();

    cy.visit('/prints');
    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.visit(`/prints/${printId}`);
      });
    cy.get('button[data-cy-edit-btn]').click();
    cy.get('[data-cy="project-selector-input"]').clear().type(newProjectName);
    cy.get('[data-cy="project-new-option"]').click();
    cy.get('#edit-print-submit-btn').click();

    cy.get('[cy-print-row]')
      .first()
      .within(() => {
        cy.get('[data-cy="project-chip"]')
          .should('be.visible')
          .should('contain.text', newProjectName);
      });
  });

  it('should display the project in Grouped View', () => {
    const projectName = 'Grouped Test Project - ' + new Date().getTime();

    cy.visit('/prints');
    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.visit(`/prints/${printId}`);
      });
    cy.get('button[data-cy-edit-btn]').click();
    cy.get('[data-cy="project-selector-input"]').clear().type(projectName);
    cy.get('[data-cy="project-new-option"]').click();
    cy.get('#edit-print-submit-btn').click();

    cy.get('mat-button-toggle[value="grouped"]').click();

    cy.get('[data-cy="grouped-project-name"]', { timeout: 10000 })
      .filter(':visible')
      .should('contain.text', projectName);
  });
});
