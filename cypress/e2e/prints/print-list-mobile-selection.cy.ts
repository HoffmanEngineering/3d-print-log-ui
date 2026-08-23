/**
 * The card view's route into bulk actions. On desktop the table has checkboxes; at
 * this width there is no table, and the only way in is a long press on a card.
 *
 * Cypress has no long-press command and no touch input, so the gesture is driven
 * through the pointer events the directive listens to. The hold is a real wait
 * rather than a faked clock on purpose: cy.clock() replaces window.setTimeout after
 * zone.js has already patched it, so the callback would fire outside Angular's zone
 * and never trigger change detection.
 */
describe('Print List Mobile Selection', () => {
  const PHONE_WIDTH = 390;
  const PHONE_HEIGHT = 844;

  /** Comfortably past LONG_PRESS_DELAY_MS (500ms), so the timer has certainly run. */
  const HOLD_MS = 700;

  beforeEach(() => {
    cy.viewport(PHONE_WIDTH, PHONE_HEIGHT);
    cy.login();
  });

  const showOnly = (prefix: string, expectedCards: number) => {
    cy.visit('/prints');
    cy.openFilterPanel();
    cy.findByRole('button', { name: /reset filters/i }).click();
    cy.findByRole('textbox', { name: /search/i }).type(prefix);
    cy.get('app-print-card').should('have.length', expectedCards);
  };

  const longPress = (index: number) => {
    cy.get('app-print-card')
      .eq(index)
      .trigger('pointerdown', { button: 0, clientX: 50, clientY: 50 });
    // Holding still is the gesture; there is no event to wait for instead.
    cy.wait(HOLD_MS);
    cy.get('app-print-card').eq(index).trigger('pointerup');
  };

  const card = (index: number) =>
    cy.get('app-print-card').eq(index).find('mat-card');

  it('long-pressing a card starts a selection and reveals the action bar', () => {
    const prefix = `Mobile Select ${new Date().getTime()}`;
    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    // Nothing selected yet, so the bar is not in the DOM at all.
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');

    longPress(0);

    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );
    card(0).should('have.attr', 'aria-checked', 'true');
    card(1).should('have.attr', 'aria-checked', 'false');
  });

  // The card is a routerLink. A press that navigated to the print would make the
  // gesture useless - the selection would be on a page the user just left.
  it('does not navigate when a long press selects', () => {
    const prefix = `Mobile NoNav ${new Date().getTime()}`;
    cy.seedPrint(`${prefix} A`);

    showOnly(prefix, 1);

    longPress(0);

    cy.get('[data-cy-bulk-selection-count]').should('exist');
    cy.location('pathname').should('eq', '/prints');
  });

  it('taps toggle once selection mode is on, and clearing exits it', () => {
    const prefix = `Mobile Toggle ${new Date().getTime()}`;
    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);

    showOnly(prefix, 2);

    longPress(0);
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );

    // A plain tap now toggles rather than navigating.
    card(1).click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '2 selected'
    );

    card(1).click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '1 selected'
    );

    // Deselecting the last card leaves selection mode: the bar goes away and the
    // cards go back to being links.
    card(0).click();
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
    cy.location('pathname').should('eq', '/prints');
    card(0).should('not.have.attr', 'aria-checked');
  });

  it('selects the whole page from the actions menu and acts on it', () => {
    const prefix = `Mobile SelectAll ${new Date().getTime()}`;
    cy.seedPrint(`${prefix} A`);
    cy.seedPrint(`${prefix} B`);
    cy.seedPrint(`${prefix} C`);

    showOnly(prefix, 3);

    longPress(0);

    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-select-all-page]').click();
    cy.get('[data-cy-bulk-selection-count]').should(
      'contain.text',
      '3 selected'
    );

    cy.intercept('POST', '/api/Prints/bulk-update').as('bulkUpdate');

    cy.get('[data-cy-bulk-actions]').click();
    cy.get('[data-cy-bulk-set-status]').click();
    cy.get('[data-cy-bulk-status="Success"]').click();

    cy.wait('@bulkUpdate');

    // The batch succeeded, so the selection empties and the bar retires itself.
    cy.get('[data-cy-bulk-action-bar]').should('not.exist');
  });
});
