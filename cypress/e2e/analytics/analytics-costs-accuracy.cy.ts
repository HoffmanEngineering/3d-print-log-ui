const VIEWPORTS: [number, number][] = [
  [375, 667],
  [768, 1024],
  [1440, 900],
];

describe('Analytics — Costs and Accuracy tabs', () => {
  beforeEach(() => {
    cy.login();
  });

  ['Costs', 'Accuracy'].forEach((tab) => {
    VIEWPORTS.forEach(([width, height]) => {
      it(`renders ${tab} without horizontal body scroll at ${width}x${height}`, () => {
        cy.viewport(width, height);
        cy.visit('/analytics');
        cy.contains('.mat-mdc-tab', tab).click();

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

    cy.get('app-scatter-chart').should('not.exist');
    cy.get('app-accuracy-tab app-bar-chart').should('exist');
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
