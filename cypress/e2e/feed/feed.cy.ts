/**
 * `/feed` had no e2e coverage. It is the only infinite-scrolling list in the
 * app: there is no paginator to click, so the next page is fetched from a
 * window scroll handler that reads `document.scrollHeight`, and the cursor is
 * the `createdDate` of the last row already on screen. None of that survives
 * being unit tested - a component test has no scrollable window, and the cursor
 * is only wrong in a way you can see once there is a real first page to page
 * off the end of.
 */
describe('Feed', () => {
  beforeEach(() => {
    cy.login();
  });

  const feedRequest = () => ({
    method: 'GET' as const,
    url: /\/api\/Feed\?/,
  });

  it('shows a newly published public print', () => {
    cy.seedPublicPrintFixture().then((print: any) => {
      cy.visit('/feed');

      // The feed is newest-first, so a print created moments ago is on the
      // first page - no scrolling required to find it.
      cy.contains('mat-card', print.title).should('be.visible');
    });
  });

  it('links each row through to its print', () => {
    cy.seedPublicPrintFixture().then((print: any) => {
      cy.visit('/feed');

      cy.contains('mat-card', print.title).within(() => {
        cy.contains('a', print.title).click();
      });

      cy.location('pathname').should('eq', `/prints/${print.id}`);
      cy.contains('h1', print.title).should('be.visible');
    });
  });

  it('asks for the next page when the reader reaches the bottom', () => {
    cy.intercept(feedRequest()).as('feed');
    cy.visit('/feed');

    // The first page has to be on screen before scrolling means anything.
    cy.wait('@feed')
      .its('request.url')
      .then((firstUrl) => {
        cy.get('app-print-summary-card').should('have.length.greaterThan', 0);

        cy.intercept(feedRequest()).as('nextPage');
        cy.scrollTo('bottom');

        // The cursor is what makes this a page rather than a repeat: the second
        // request must ask for rows older than the ones already shown.
        cy.wait('@nextPage')
          .its('request.url')
          .should((nextUrl) => {
            expect(nextUrl).to.not.equal(firstUrl);
            expect(nextUrl).to.contain('fromDateTime=');
          });
      });
  });

  it('tells the reader when there is nothing older left', () => {
    // Only the SECOND request is stubbed empty; the first is left alone so the
    // list genuinely renders before the end-of-feed state is asserted. The
    // banner is deliberately gated on a non-empty feed in the template, so
    // stubbing both would assert a state the app never shows.
    let requestCount = 0;
    cy.intercept(feedRequest(), (req) => {
      requestCount += 1;
      if (requestCount > 1) {
        req.reply({
          statusCode: 200,
          body: [],
          headers: { 'cache-control': 'no-store' },
        });
      }
    }).as('feed');

    cy.visit('/feed');
    cy.get('app-print-summary-card').should('have.length.greaterThan', 0);

    cy.scrollTo('bottom');

    cy.contains(/you're all caught up/i).should('be.visible');

    // Exhausted, not emptied: the rows already fetched stay on screen.
    cy.get('app-print-summary-card').should('have.length.greaterThan', 0);
  });
});
