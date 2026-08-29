import { apiUrl } from '../../support/api-url';

// Every project this spec creates is named `<prefix> - <timestamp>`. The
// after() hook below deletes them again, because the grouped feed orders a
// project by the start date of its prints and falls back to the created date
// only when a project has none - so a pile of leftover print-less projects
// from earlier runs pushes the projects under test off page 1. Cleaning up
// keeps the dev database from drifting into that state, and purges whatever
// earlier runs already left behind.
const PROJECT_NAME_PREFIXES = [
  'New Test Project',
  'Edit Test Project',
  'Updated Test Project',
  'Assign Test Project',
  'Selector Test Project',
  'Edit Display Test Project',
  'Remove Test Project',
  'Grouped Test Project',
];

const DEV_HEADERS = { 'X-Dev-User-Id': '1' };

describe('Projects', () => {
  beforeEach(() => {
    cy.login();
  });

  // Prints are kept (`deletePrints=false`): the specs above assign the seeded
  // dev prints to their projects, and deleting those would strip the database
  // the rest of the suite runs against.
  after(() => {
    cy.request({
      method: 'GET',
      url: `${apiUrl()}/api/Projects?pageNumber=1&pageSize=100`,
      headers: DEV_HEADERS,
    }).then(({ body }) => {
      body.items
        .filter((project: { name: string }) =>
          PROJECT_NAME_PREFIXES.some((prefix) =>
            project.name.startsWith(`${prefix} - `)
          )
        )
        .forEach((project: { id: string }) => {
          cy.request({
            method: 'DELETE',
            url: `${apiUrl()}/api/Projects/${project.id}?deletePrints=false`,
            headers: DEV_HEADERS,
          });
        });
    });
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
    cy.get('[data-cy-edit-btn]').click();
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
    cy.get('[data-cy-edit-btn]').click();
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

  it('should show the assigned project name when re-entering the print edit page', () => {
    const ts = new Date().getTime();
    const projectName = 'Edit Display Test Project - ' + ts;

    cy.intercept('POST', '/api/Projects').as('createProject');
    cy.visit('/projects/new');
    cy.get('[data-testid="name-input"]').type(projectName);
    cy.get('[data-cy="project-save-btn"]').click();
    cy.wait('@createProject');

    cy.visit('/prints');
    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.visit(`/prints/${printId}`);
        cy.get('[data-cy-edit-btn]').click();

        cy.intercept('PUT', '/api/Prints/*').as('assignPrint');
        cy.get('[data-cy="project-selector-input"]').clear().type(projectName);
        cy.get('mat-option').contains(projectName).click();
        cy.get('#edit-print-submit-btn').click();
        cy.wait('@assignPrint');

        cy.visit(`/prints/${printId}`);
        cy.get('[data-cy-edit-btn]').click();

        cy.get('[data-cy="project-selector-input"]').should(
          'have.value',
          projectName
        );
        cy.get('button[aria-label="Clear"]').should('be.visible');
      });
  });

  it('should allow removing a print from a project via the clear button', () => {
    const ts = new Date().getTime();
    const projectName = 'Remove Test Project - ' + ts;

    cy.intercept('POST', '/api/Projects').as('createProject');
    cy.visit('/projects/new');
    cy.get('[data-testid="name-input"]').type(projectName);
    cy.get('[data-cy="project-save-btn"]').click();
    cy.wait('@createProject');

    cy.visit('/prints');
    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.visit(`/prints/${printId}`);
        cy.get('[data-cy-edit-btn]').click();

        cy.intercept('PUT', '/api/Prints/*').as('assignPrint');
        cy.get('[data-cy="project-selector-input"]').clear().type(projectName);
        cy.get('mat-option').contains(projectName).click();
        cy.get('#edit-print-submit-btn').click();
        cy.wait('@assignPrint');

        cy.visit(`/prints/${printId}`);
        cy.get('[data-cy-edit-btn]').click();

        cy.intercept('PUT', '/api/Prints/*').as('removePrint');
        cy.get('button[aria-label="Clear"]').click();
        cy.get('#edit-print-submit-btn').click();
        cy.wait('@removePrint');

        cy.get(`[cy-print-row="${printId}"]`).within(() => {
          cy.get('[data-cy="project-chip"]').should('not.exist');
        });
      });
  });

  it('should display the project in Grouped View', () => {
    const ts = new Date().getTime();
    const projectName = 'Grouped Test Project - ' + ts;

    // Seed a print dated now rather than reusing the oldest seeded print. The
    // grouped feed sorts a project by its prints' start dates, so a project
    // whose only print is days old sorts below every print-less project and
    // can drop off page 1 - which is what this assertion reads.
    cy.seedPrint('Grouped View Print - ' + ts).then((print) => {
      cy.visit(`/prints/${print.id}`);
      cy.get('[data-cy-edit-btn]').click();
      cy.get('[data-cy="project-selector-input"]').clear().type(projectName);
      cy.get('[data-cy="project-new-option"]').click();
      cy.get('#edit-print-submit-btn').click();

      cy.get('mat-button-toggle[value="grouped"]').click();

      cy.get('[data-cy="grouped-project-name"]', { timeout: 10000 })
        .filter(':visible')
        .should('contain.text', projectName);
    });
  });
});
