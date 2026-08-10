// Owner-side counterpart to public-print-anonymous.cy.ts.
//
// The print is CREATED rather than hunted for: cy.login() is a dev-bypass
// session with no reusable bearer token, so the owner's prints cannot be
// queried over the API the way the anonymous spec queries /api/Prints/public.
// cy.createPrint guarantees an owned print with a printer, so the two positive
// assertions below are deterministic rather than seed-data dependent.
//
// Material cost is deliberately NOT asserted here: it requires priced filament
// usage, which cy.createPrint does not set. Cost gating is covered
// deterministically by the owner/non-owner unit tests in
// print-detail-summary.component.spec.ts, where the price inputs are mocked.
// Do not add a cost assertion here without first extending cy.createPrint to
// attach priced filament.

describe('Print detail as the owner', () => {
  beforeEach(() => cy.login());

  it('shows owner-only data and has no critical accessibility violations', () => {
    const title = `A11y owner print ${Date.now()}`;
    cy.createPrint(title);

    cy.visit('/prints');
    // Scoped to the desktop table row: a bare cy.contains(title) matches the
    // hidden mobile-card copy of the same print first, which is not clickable.
    cy.contains('[cy-print-row]', title).find('.mat-column-title').click();
    cy.location('pathname').should('match', /\/prints\/\d+$/);

    // Positive counterparts to the anonymous spec's absence assertions.
    cy.get('[data-cy-edit-btn]').should('exist');
    cy.get('[data-cy-printer-link]').should('exist');

    cy.checkA11yWithReport(undefined, {
      includedImpacts: ['critical', 'serious'],
    });
  });
});
