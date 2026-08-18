describe('Material detail — remaining and prints', () => {
  beforeEach(() => {
    cy.login();
  });

  // Creates a weight-tracked material and yields its id, so every assertion runs
  // against a spool this spec owns rather than whatever happens to sort first.
  function createTrackedFilament(name: string): Cypress.Chainable<string> {
    cy.visit('/filament');
    cy.get('#add-new-filament').click();

    cy.get('#edit-filament-name').type(name);

    cy.get('mat-select[formControlName="materialCategoryNickname"]')
      .click()
      .get('mat-option')
      .first()
      .click();

    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.get('#filament-inital-nominal-weight')
      .clear({ force: true })
      .type('1000', { force: true });

    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.get('#edit-filament-submit-btn').click();

    return cy
      .wait('@createFilament')
      .then((interception) => interception.response!.body.id as string);
  }

  it('shows remaining material and the prints panel on a saved spool', () => {
    createTrackedFilament('Remaining E2E - ' + new Date().getTime()).then(
      (id) => {
        cy.visit(`/filament/${id}`);

        cy.get('app-filament-remaining-card').should('be.visible');
        cy.get('app-filament-remaining-card').should('contain.text', '1,000');
        cy.get('app-filament-prints-panel').should(
          'contain.text',
          'No prints have used this material yet'
        );
      }
    );
  });

  it('previews an unsaved adjustment and leaves the form clean until edited', () => {
    createTrackedFilament('Projection E2E - ' + new Date().getTime()).then(
      (id) => {
        cy.visit(`/filament/${id}`);

        // Pristine: the card shows the server's figure with no "after saving" note.
        cy.get('app-filament-remaining-card').should(
          'not.contain.text',
          'after saving'
        );

        cy.contains('button', 'Add New Adjustment').click();
        cy.get('input[formcontrolname="amountG"]')
          .last()
          .type('-32', { force: true });

        cy.get('app-filament-remaining-card').should(
          'contain.text',
          'after saving'
        );
        cy.get('app-filament-remaining-card').should('contain.text', '968');
      }
    );
  });

  it('keeps the stats card pinned while scrolling the form', () => {
    cy.viewport(1440, 900);

    createTrackedFilament('Sticky E2E - ' + new Date().getTime()).then((id) => {
      cy.visit(`/filament/${id}`);

      // Scroll the long form far enough that a non-sticky card would be well
      // above the viewport, then require the card to be pinned at its sticky
      // offset and to STAY there through a second, larger scroll.
      // `should('be.visible')` alone would pass for a card that simply scrolled
      // along with the page, which is the failure sticky has: it no-ops silently
      // when an ancestor clips or scrolls unexpectedly.
      const STICKY_TOP = 16;

      cy.contains('h2', 'Purchase Details').scrollIntoView();
      cy.get('app-filament-remaining-card').should(($after) => {
        expect($after[0].getBoundingClientRect().top).to.be.closeTo(
          STICKY_TOP,
          2
        );
      });

      cy.scrollTo('bottom');
      cy.get('app-filament-remaining-card').should(($atBottom) => {
        expect($atBottom[0].getBoundingClientRect().top).to.be.closeTo(
          STICKY_TOP,
          2
        );
      });
    });
  });

  it('shows neither card in add mode', () => {
    cy.visit('/filament/new');

    cy.get('app-filament-remaining-card').should('not.exist');
    cy.get('app-filament-prints-panel').should('not.exist');
  });
});
