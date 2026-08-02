const VIEWPORTS: [number, number][] = [
  [375, 667],
  [768, 1024],
  [1440, 900],
];

/**
 * The e2e database has no priced prints and none with both an estimate and a measured time, so
 * both tabs render their empty state against it — a layout assertion on an empty card proves
 * nothing. Stubbing is what makes these specs actually exercise the charts.
 *
 * `no-store` matters: without it the browser caches the stubbed response and later tests are
 * served from cache, which never reaches Cypress's proxy. That makes `cy.wait('@alias')` time
 * out on a page that in fact rendered fine — so readiness is asserted on the DOM below, not on
 * the network.
 */
const stubAnalytics = () => {
  const noStore = { 'cache-control': 'no-store' };
  // Matched by regex, not glob: the API is on another origin (localhost:5001) and a
  // `**/api/...` glob does not reliably match an absolute cross-origin URL.
  cy.intercept(
    { method: 'GET', url: /\/api\/analytics\/costs/ },
    { fixture: 'analytics-costs.json', headers: noStore }
  ).as('costs');
  cy.intercept(
    { method: 'GET', url: /\/api\/analytics\/accuracy/ },
    { fixture: 'analytics-accuracy.json', headers: noStore }
  ).as('accuracy');
};

describe('Analytics — Costs and Accuracy tabs', () => {
  beforeEach(() => {
    cy.login();
    stubAnalytics();
  });

  ['Costs', 'Accuracy'].forEach((tab) => {
    VIEWPORTS.forEach(([width, height]) => {
      it(`renders ${tab} without horizontal body scroll at ${width}x${height}`, () => {
        cy.viewport(width, height);
        cy.visit('/analytics');
        cy.contains('.mat-mdc-tab', tab).click();

        // Only the 'ready' state projects chart content, and only the stub can produce it —
        // so this also guards against the assertion below passing on an empty card.
        cy.get('[data-testid="chart-content"]').should(
          'have.length.at.least',
          1
        );

        cy.document().then((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(
            doc.documentElement.clientWidth + 1
          );
        });
      });
    });
  });

  it('substitutes bars for the scatter on a phone', () => {
    cy.viewport(375, 667);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Accuracy').click();

    cy.get('app-accuracy-tab app-bar-chart').should('exist');
    cy.get('app-scatter-chart').should('not.exist');
  });

  it('shows the full scatter on desktop', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Accuracy').click();

    cy.get('app-scatter-chart').should('exist');
    cy.get('line.scatter-chart__reference').should('exist');
  });

  it('mounts only the active tab, so six tabs of charts never render at once', () => {
    cy.viewport(375, 667);
    cy.visit('/analytics');

    cy.get('app-overview-tab').should('exist');
    cy.get('app-accuracy-tab').should('not.exist');
    cy.get('app-materials-tab').should('not.exist');
  });
});
