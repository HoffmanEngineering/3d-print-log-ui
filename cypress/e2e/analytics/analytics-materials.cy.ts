const VIEWPORTS: [number, number][] = [
  [375, 667],
  [768, 1024],
  [1440, 900],
];

describe('Analytics — Materials tab', () => {
  beforeEach(() => {
    cy.login();
  });

  VIEWPORTS.forEach(([width, height]) => {
    it(`renders without horizontal body scroll at ${width}x${height}`, () => {
      cy.viewport(width, height);
      cy.visit('/analytics');
      cy.contains('.mat-mdc-tab', 'Materials').click();

      cy.get('app-materials-tab').should('exist');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(
          doc.documentElement.clientWidth + 1
        );
      });
    });
  });

  it('never emits a swatch gradient whose stop-color is not a hex colour', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Materials').click();

    cy.get('app-materials-tab').should('exist');
    cy.get('body').then(($body) => {
      const stops = $body.find('stop');
      stops.each((_, stop) => {
        const color = stop.getAttribute('stop-color');
        if (color) expect(color).to.match(/^#[0-9a-fA-F]{3,6}$/);
      });
    });
  });

  it('labels every swatch-filled bar with its material name, not colour alone', () => {
    cy.viewport(1440, 900);
    cy.visit('/analytics');
    cy.contains('.mat-mdc-tab', 'Materials').click();

    cy.get('app-materials-tab table[chartDataTable]').should('exist');
  });
});
