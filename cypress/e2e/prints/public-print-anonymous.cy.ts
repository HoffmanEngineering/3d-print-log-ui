// Regression for #66: a logged-out visitor deep-linking to a public print at
// /prints/:id must see it render, not get bounced to /.
//
// Uses the dev-only anonymous simulation (?devUserId=anonymous) and
// deliberately does NOT call cy.login().
//
// The print under test is SEEDED rather than picked from whatever is in the
// dev database. The negative assertions below ("no filament links", "no
// printer link") only mean something on a print that actually has filaments
// and a printer — on an empty print they pass trivially. cy.seedPublicPrintFixture
// guarantees both.

describe('Anonymous public print view', () => {
  it('renders a public print without redirecting home, and hides owner-only data', () => {
    cy.seedPublicPrintFixture().then((print: any) => {
      const filamentUsage = print.filamentUsage.find((fu: any) => fu.filament);
      expect(filamentUsage, 'fixture print has a filament row').to.exist;
      expect(print.printer, 'fixture print has a printer').to.exist;

      cy.clearLocalStorage();

      // Registered before the visit so the attachment fetch is captured.
      cy.intercept('GET', '**/api/Prints/*/files*').as('attachments');

      cy.visit(`/prints/${print.id}?devUserId=anonymous`);

      // 1) No bounce to home (#66).
      cy.location('pathname').should('eq', `/prints/${print.id}`);

      // 2) Positive assertions FIRST — prove the page rendered the very
      //    content whose owner-only variants we are about to assert absent.
      cy.contains('h1', print.title).should('be.visible');
      cy.contains(print.printer.make).should('be.visible');
      cy.contains(filamentUsage.filament.displayName).should('be.visible');

      // 3) Owner-only data is absent.
      //
      // These ARE non-vacuous: the fixture has filament rows and a printer,
      // and step 2 proved both render as text — so a leaking implementation
      // would produce these links and fail here.
      cy.get('[data-cy-edit-btn]').should('not.exist');
      cy.get('[data-cy-printer-link]').should('not.exist');
      cy.get('a[href*="/filament/"]').should('not.exist');

      // 4) Cost absence is asserted but is NOT evidence of gating, and must
      //    not be cited as such. Material cost needs a recorded filament price
      //    and electricity cost needs the VIEWER's kWh rate — an anonymous
      //    viewer has neither, so both stay absent even if the gate were
      //    removed entirely. Kept as a cheap tripwire only. The real
      //    cost-gating coverage is the owner/non-owner unit tests in
      //    print-detail-summary.component.spec.ts, where prices and rates are
      //    mocked and the assertions can genuinely fail.
      cy.contains('Material cost').should('not.exist');
      cy.contains('Electricity').should('not.exist');

      // 5) The source link is ungated — everyone gets it, in a new tab.
      cy.get('[data-cy-source-link]')
        .should('have.attr', 'href', print.url)
        .and('have.attr', 'rel', 'noopener noreferrer');

      // NOTE: still no project-link assertion. The rail now links off
      // projectId and resolves the name separately, so the link CAN appear —
      // but the seeded fixture has no project, which would make any assertion
      // here vacuous either way. Covered deterministically in
      // print-detail-summary.component.spec.ts instead.

      // 6) The file attachment section fetches on init even for anonymous
      //    visitors. Assert the request outcome rather than the host element's
      //    existence — a rendered tag proves nothing about the fetch. Whatever
      //    the API decides, the page must stay intact.
      cy.wait('@attachments')
        .its('response.statusCode')
        .should('be.oneOf', [200, 401, 403, 404]);
      cy.get('h1').should('be.visible');

      // 7) Accessibility, anonymous branch.
      cy.checkA11yWithReport(undefined, {
        includedImpacts: ['critical', 'serious'],
      });
    });
  });

  // The route used to be resolver-gated, so navigation was held until the print
  // arrived. It now activates immediately and the component fetches. That moves
  // the #66 risk rather than removing it: a logged-out visitor must still land
  // on the print, and must not see "Print not found" while the fetch is in
  // flight. The delay makes the loading window observable instead of racing it.
  it('paints a skeleton while loading and then the print, without bouncing home', () => {
    cy.seedPublicPrintFixture().then((print: any) => {
      cy.clearLocalStorage();

      cy.intercept('GET', `**/api/Prints/${print.id}`, (req) => {
        req.on('response', (res) => res.setDelay(1500));
      }).as('printDetail');

      cy.visit(`/prints/${print.id}?devUserId=anonymous`);

      // The shell is on screen before the response lands — that is the whole
      // point of dropping the resolver.
      cy.get('[data-testid="print-detail-skeleton"]').should('be.visible');
      cy.contains('h1', /print not found/i).should('not.exist');
      cy.location('pathname').should('eq', `/prints/${print.id}`);

      // Accessibility of the LOADING state, which no other test covers.
      cy.checkA11yWithReport(undefined, {
        includedImpacts: ['critical', 'serious'],
      });

      cy.wait('@printDetail');

      cy.get('[data-testid="print-detail-skeleton"]').should('not.exist');
      cy.contains('h1', print.title).should('be.visible');
      cy.location('pathname').should('eq', `/prints/${print.id}`);
    });
  });

  // With no resolver left, a failing fetch can no longer cancel navigation —
  // but it must not strand the page on its skeleton either.
  it('shows the not-found view rather than an endless skeleton when the print 500s', () => {
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/Prints/424242', {
      statusCode: 500,
      body: {},
    }).as('printDetail');

    cy.visit('/prints/424242?devUserId=anonymous');

    cy.wait('@printDetail');
    cy.location('pathname').should('eq', '/prints/424242');
    cy.contains('h1', /print not found/i).should('be.visible');
    cy.get('[data-testid="print-detail-skeleton"]').should('not.exist');
  });
});
