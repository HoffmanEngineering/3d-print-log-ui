import { apiUrl } from '../../support/api-url';

describe('Print List Bulk Actions', () => {
  beforeEach(() => {
    cy.login();
  });

  /**
   * Narrows the list to just the prints created by this test, so "select all on
   * this page" is a known, small set.
   *
   * The prints themselves are seeded through the API (`cy.seedPrint`) rather
   * than typed into the new-print form. This spec needs eighteen of them and
   * none of its assertions are about the form, so paying a page load and a form
   * fill for each one bought nothing - it just made this the slowest spec in the
   * suite. `cy.createPrint` still exists for the specs that do test that form.
   */
  const showOnly = (prefix: string, expectedRows: number) => {
    cy.visit('/prints');
    cy.openFilterPanel();
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.findByRole('textbox', { name: /search/i }).type(prefix);
    cy.get('[cy-print-row]').should('have.length', expectedRows);
  };

  it('sets the status of several prints in one action', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Status ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    // The bar is contextual — nothing selected, nothing shown.
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');

    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-set-status]').click();
    cy.get('[data-cy-bulk-status="Success"]').click();

    // One request for the whole selection - it fits inside a single 25-id chunk.
    cy.wait('@bulkUpdate');

    // Everything succeeded, so the selection is emptied and the bar disappears.
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');

    cy.get('[cy-print-row]').should('have.length', 2);
    // Retryable: the list reloads in place once the batch finishes.
    cy.get('[cy-print-row] .mat-column-status')
      .filter(':contains("Success")')
      .should('have.length', 2);
  });

  it('selects a single row, then clears the selection', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Clear ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.get('[cy-print-row]')
      .first()
      .invoke('attr', 'cy-print-row')
      .then((printId) => {
        cy.get(`[data-cy-select-print="${printId}"]`).click();
        // The tick is driven by the native input's :checked state, so a handler
        // that cancels the click leaves the box blank while the count says 1.
        cy.get(
          `[data-cy-select-print="${printId}"] input[type="checkbox"]`
        ).should('be.checked');
      });

    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );

    cy.get('[data-cy-bulk-clear]').click();
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
  });

  it('keeps the selection when the result set changes', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Persist ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    // Narrowing the search re-runs the same code path as paging, sorting and
    // filtering. Both prints stay selected even though one is now off screen.
    cy.findByRole('textbox', { name: /search/i }).type(' A');
    cy.get('[cy-print-row]').should('have.length', 1);
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );
  });

  it('is operable from the keyboard', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Keyboard ${ts}`;

    cy.seedPrint(`${prefix} A`);

    showOnly(prefix, 1);

    // Select-all reachable and togglable without a mouse.
    cy.get('[data-cy-select-all-prints] input').focus().type(' ');
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );

    // Every action now lives behind one trigger, so that trigger and the menu it
    // opens are the whole keyboard surface for bulk actions.
    cy.get('[data-cy-bulk-actions]').focus().type('{enter}');
    cy.get('[data-cy-bulk-set-status]').should('be.visible').focus();
    cy.focused().should('have.attr', 'data-cy-bulk-set-status');
    cy.get('body').type('{esc}');

    cy.get('[data-cy-bulk-clear]').focus().type('{enter}');
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
  });

  it('confirms before deleting the selected prints', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Delete ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-delete]').click();

    // Cancelling leaves everything alone.
    cy.contains('mat-dialog-container, .mat-mdc-dialog-container', '2 prints')
      .should('exist')
      .within(() => {
        cy.contains('button', 'Cancel').click();
      });
    cy.get('[cy-print-row]').should('have.length', 2);
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    cy.intercept('POST', '/api/Prints/bulk-delete').as('bulkDelete');

    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-delete]').click();
    cy.contains('.mat-mdc-dialog-container button', 'Delete').click();

    cy.wait('@bulkDelete');

    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
    cy.get('[cy-print-row]').should('have.length', 0);
  });

  it('adds several prints to a new project', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Project ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.intercept('POST', '/api/Projects').as('createProject');
    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-add-to-project]').click();

    cy.get('[data-cy="project-selector-input"]').type(`Project ${ts}`);
    cy.get('[data-cy="project-new-option"]').click();
    cy.get('[data-cy-bulk-project-confirm]').click();

    // One project is created for the whole batch, not one per print.
    cy.wait('@createProject').then((created) => {
      const projectId = created.response!.body.id;
      cy.get('@createProject.all').should('have.length', 1);
      // The id that was created is the id the prints were filed under. Waiting
      // for the request without reading it would pass with the wrong project.
      cy.wait('@bulkUpdate')
        .its('request.body.projectId')
        .should('equal', projectId);
    });

    cy.contains('2 prints updated').should('exist');
  });

  it('adds several prints to an existing project', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Existing Project ${ts}`;
    const projectName = `Existing Project ${ts}`;

    // Create the project up front, so this test exercises the pick-an-existing-one
    // branch rather than the create-a-new-one branch above.
    cy.createProject(projectName).as('seededProject');
    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.intercept('POST', '/api/Projects').as('createProject');
    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-add-to-project]').click();

    cy.get('[data-cy="project-selector-input"]').type(projectName);
    cy.contains('mat-option', projectName).click();
    cy.get('[data-cy-bulk-project-confirm]').click();

    cy.get('@seededProject').then((project: any) => {
      cy.wait('@bulkUpdate')
        .its('request.body.projectId')
        .should('equal', project.id);
    });
    // Picking an existing project must not create anything.
    cy.get('@createProject.all').should('have.length', 0);
    cy.contains('2 prints updated').should('exist');
  });

  it('reassigns several prints to a different printer', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Printer ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-actions]').click();
    cy.contains('.mat-mdc-menu-item', 'Printer').click();
    // Capture which printer was chosen so the request can be checked against it.
    // "printerId is a number" would pass with every printer in the list.
    cy.get('[data-cy-bulk-printer]')
      .first()
      .invoke('attr', 'data-cy-bulk-printer')
      .then((printerName) => {
        cy.get(`[data-cy-bulk-printer="${printerName}"]`).click();

        cy.wait('@bulkUpdate').then((request) => {
          cy.request({
            url: `${apiUrl()}/api/printers/summary?PageNumber=1&PageSize=100`,
            headers: { 'X-Dev-User-Id': '1' },
          }).then((response) => {
            const printer = response.body.items.find(
              (p: { name: string }) => p.name === printerName
            );
            expect(request.request.body.printerId).to.equal(printer.id);
          });
        });
      });
    cy.contains('2 prints updated').should('exist');
  });

  it('sets the visibility of several prints in one action', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Visibility ${ts}`;

    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-actions]').click();
    cy.contains('.mat-mdc-menu-item', 'Visibility').click();
    cy.get('[data-cy-bulk-visibility="Public"]').click();

    // 1 is PrintViewStatus.Public. Enums travel as integers, so asserting the
    // value here is what catches a string ever being sent instead.
    cy.wait('@bulkUpdate').its('request.body.viewStatus').should('equal', 1);
    cy.contains('2 prints updated').should('exist');
  });

  it('removes several prints from their project', () => {
    const ts = new Date().getTime();
    const prefix = `Bulk Unfile ${ts}`;

    cy.seedPrint(`${prefix} A`);

    showOnly(prefix, 1);

    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-select-all-prints]').click();
    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-add-to-project]').click();
    cy.get('[data-cy-bulk-project-remove]').click();

    cy.wait('@bulkUpdate')
      .its('request.body.clear')
      .should('deep.equal', ['projectId']);
  });
});
