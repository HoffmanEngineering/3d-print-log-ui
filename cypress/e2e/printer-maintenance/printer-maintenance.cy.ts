import { apiUrl } from '../../support/api-url';

/**
 * `/printer-maintenance` is the only list in the app edited inline: a new row is
 * appended locally with an empty GUID, validated in the component, and only
 * then POSTed. None of that had e2e coverage, so the two failure modes it is
 * most prone to - a row that saves without a printer, and a row that appears in
 * the table but never reaches the server - were both unguarded.
 */
// Routes are matched by regex rather than by glob throughout this spec: the API
// is on another origin, and a `*` in a Cypress glob does not cross a `/`, so the
// id segment on `/api/PrinterMaintenance/{id}` slips past `**/api/...*`.
describe('Printer Maintenance', () => {
  beforeEach(() => {
    cy.login();
    // The maintenance table carries seven columns of inline editors and sizes
    // itself to their content, so below roughly 2000px it overflows into a
    // horizontal scroller and the row's own Save/Delete buttons end up outside
    // it - Cypress scrolls the container, the row slides under the sticky
    // toolbar, and the click is refused as hidden. A viewport wide enough to
    // fit the table is what removes the overflow, not a forced click.
    cy.viewport(2200, 1000);
  });

  /** The row being edited is the only one rendering form fields. */
  const editingRow = () => cy.get('tr').filter(':has(mat-form-field)').first();

  it('refuses to save a new entry until a printer is chosen', () => {
    cy.visit('/printer-maintenance');

    cy.get('#add-entry').click();

    // The date is prefilled with today, so the printer is the only thing
    // missing - the entry must not be POSTed on the first Save click.
    cy.intercept({ method: 'POST', url: /\/api\/PrinterMaintenance/ }).as(
      'createEntry'
    );

    editingRow().within(() => {
      cy.findByRole('button', { name: /^save$/i }).click();
    });

    cy.contains(/printer is required/i).should('be.visible');
    cy.get('@createEntry.all').should('have.length', 0);

    // Choosing a printer clears the block and the same Save now goes through.
    editingRow().within(() => {
      cy.findByRole('combobox', { name: /printer/i }).click();
    });
    cy.findAllByRole('option').first().click();

    editingRow().within(() => {
      cy.findByRole('button', { name: /^save$/i }).click();
    });
    cy.wait('@createEntry')
      .its('response.body.id')
      .then((entryId: string) => {
        cy.contains(/printer is required/i).should('not.exist');

        // This test exists to prove the guard, not to leave a row behind; the
        // dev database is shared with every other spec in the suite.
        cy.request({
          method: 'DELETE',
          url: `${apiUrl()}/api/PrinterMaintenance/${entryId}`,
          headers: { 'X-Dev-User-Id': '1' },
        });
      });
  });

  it('adds an entry that survives a reload, then deletes it', () => {
    // Kept short deliberately: the table sizes its columns to content, and a
    // long description pushes the row's Save/Edit buttons past the viewport.
    const description = 'E2E-' + new Date().getTime();

    cy.intercept({ method: 'POST', url: /\/api\/PrinterMaintenance/ }).as(
      'createEntry'
    );
    cy.visit('/printer-maintenance');

    cy.get('#add-entry').click();

    editingRow().within(() => {
      cy.findByRole('combobox', { name: /printer/i }).click();
    });
    cy.findAllByRole('option').first().click();

    editingRow().within(() => {
      cy.get('.mat-column-description input').type(description);
      cy.get('.mat-column-price input').type('12.50');
      cy.findByRole('button', { name: /^save$/i }).click();
    });
    cy.wait('@createEntry')
      .its('response.body.id')
      .then((entryId: string) => {
        // Matched on the row's id rather than on its text: immediately after a
        // save the row can still be rendering its inline editors, where the
        // description lives in an input value that `cy.contains` cannot see.
        cy.get(`[cy-print-row="${entryId}"]`).should('exist');
      });

    // A reload is what separates "rendered locally" from "actually stored" -
    // and it also guarantees plain text cells rather than inline editors.
    //
    // Found by searching rather than by looking at page 1: every seeded entry
    // carries today's date and the list is sorted by date, so the new row's
    // position among its same-day siblings is not defined. The component even
    // has a toast for "the new entry was added to a different page".
    cy.intercept({ method: 'GET', url: /\/api\/PrinterMaintenance\?/ }).as(
      'search'
    );
    cy.reload();
    // Cleared, not appended to: the search text round-trips through the URL, so
    // a reload brings any previous query back into the box.
    cy.findByRole('textbox', { name: /search/i })
      .clear()
      .type(description);
    cy.wait('@search');

    // The search is debounced by 400ms and `@search` can be satisfied by the
    // page's own initial load, so the row count is what actually says the
    // filtered list is on screen. It is deliberately not the paginator label:
    // "1 - 10 of 11" contains the substring "1 of 1", so a range assertion
    // would pass on the unfiltered list too.
    cy.get('tbody tr').should('have.length', 1);
    cy.get('tbody tr')
      .should('contain.text', description)
      .and('contain.text', '12.50');

    cy.intercept({ method: 'DELETE', url: /\/api\/PrinterMaintenance\// }).as(
      'deleteEntry'
    );

    // Delete lives behind Edit, and clicking Edit swaps the row's cells for
    // inline editors - which moves the description out of the row's text and
    // into an input value, where `cy.contains` can no longer see it. The row is
    // therefore re-found as "the row currently being edited", not by its text.
    cy.contains('tr', description).within(() => {
      cy.findByRole('button', { name: /^edit$/i }).click();
    });
    editingRow().within(() => {
      cy.findByRole('button', { name: /^delete$/i }).click();
    });

    // Scoped to the dialog: the row's own Delete button is still on the page.
    cy.get('.mat-mdc-dialog-container')
      .should('be.visible')
      .within(() => {
        cy.findByRole('button', { name: /^delete$/i }).click();
      });
    cy.wait('@deleteEntry');

    // The search filter is still applied, so the list the delete leaves behind
    // is the empty state rather than "some other rows".
    cy.contains(/no maintenance entries found/i).should('be.visible');

    cy.reload();
    cy.findByRole('textbox', { name: /search/i })
      .clear()
      .type(description);
    cy.contains(/no maintenance entries found/i).should('be.visible');
  });

  it('reports an empty result rather than an empty table for a search that matches nothing', () => {
    cy.visit('/printer-maintenance');

    cy.findByRole('textbox', { name: /search/i }).type(
      'no-such-maintenance-entry-' + new Date().getTime()
    );

    cy.contains(/no maintenance entries found/i).should('be.visible');
  });
});
