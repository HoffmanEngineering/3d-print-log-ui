const VIEWPORTS: [number, number][] = [
  [375, 667],
  [768, 1024],
  [1440, 900],
];

describe('Analytics — Activity tab', () => {
  beforeEach(() => {
    cy.login();
  });

  VIEWPORTS.forEach(([width, height]) => {
    it(`renders without horizontal body scroll at ${width}x${height}`, () => {
      cy.viewport(width, height);
      cy.visit('/analytics');
      cy.contains('.mat-mdc-tab', 'Activity').click();

      cy.get('app-activity-tab').should('exist');

      // The page body must never scroll sideways. Wide content scrolls inside its own box.
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(
          doc.documentElement.clientWidth + 1
        );
      });
    });
  });

  it('keeps the calendar scroll inside its own container', () => {
    cy.viewport(375, 667);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Activity').click();

    cy.get('.calendar-heatmap').should(($el) => {
      expect($el[0].scrollWidth).to.be.greaterThan($el[0].clientWidth - 1);
    });
  });

  it('switches the plotted metric without a page reload', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Activity').click();

    cy.contains('mat-button-toggle', 'Filament').click();
    cy.contains('Filament (grams) over time').should('exist');
  });

  it('clicking a calendar day opens a date-filtered print list', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Activity').click();

    cy.get('rect.calendar-heatmap__hit').first().click({ force: true });

    cy.location('pathname').should('eq', '/prints');
    cy.location('search').should('include', 'fromDate=');
    cy.location('search').should('include', 'toDate=');
    // Click-through URLs must never carry userId — that would show only PUBLIC prints.
    cy.location('search').should('not.include', 'userId=');
  });
});
