/**
 * `/settings` had no e2e coverage, even though almost every value on it is a
 * default that other pages read back: the currency symbol, the filament
 * diameter and price a new material starts with, and the electricity rate that
 * feeds print cost. A setting that saves but does not reload, or reloads but
 * does not reach the page that consumes it, is invisible to a unit test of the
 * settings component alone.
 *
 * Every test here puts back what it changed - see `cy.restoreUserSettings`,
 * which documents the one case it cannot fully undo (a settings row that did
 * not exist before the spec ran cannot be deleted, only overwritten).
 */
describe('Settings', () => {
  let settingsSnapshot: any[] = [];

  beforeEach(() => {
    cy.login();
    // Reset first: if the snapshot request fails, the cleanup below must not
    // silently "restore" the previous test's snapshot over this test's writes.
    settingsSnapshot = [];
    cy.snapshotUserSettings().then((settings) => {
      settingsSnapshot = settings;
    });
  });

  afterEach(() => {
    cy.restoreUserSettings(settingsSnapshot);

    // The theme lives in localStorage, which `cy.session` caches across specs,
    // so it is reset here rather than at the end of the theme test - a mid-test
    // failure would otherwise leave every later spec running in dark mode.
    cy.window().then((win) => win.localStorage.setItem('theme-mode', 'system'));
  });

  /**
   * Each setting renders its Save button only while the edited value differs
   * from the one loaded from the API, so the button disappearing after a save
   * is the component's own statement that the write landed.
   */
  const saveButtonFor = (label: string | RegExp) =>
    cy.findByRole('button', { name: label });

  it('persists the electricity rate and wattage across a reload', () => {
    cy.visit('/settings');

    cy.get('#default-electricity-kwh-rate').clear().type('0.19');
    saveButtonFor(/save electricity rate/i).click();

    cy.get('#default-electricity-wattage').clear().type('225');
    saveButtonFor(/save default wattage/i).click();

    // Both writes must reach the API before the reload, otherwise the reload
    // could race the in-flight request and pass on stale-but-correct values.
    cy.get('#default-electricity-kwh-rate').should('have.value', '0.19');
    cy.get('#default-electricity-wattage').should('have.value', '225');
    saveButtonFor(/save electricity rate/i).should('not.exist');
    saveButtonFor(/save default wattage/i).should('not.exist');

    cy.reload();

    cy.get('#default-electricity-kwh-rate').should('have.value', '0.19');
    cy.get('#default-electricity-wattage').should('have.value', '225');
  });

  it('rewrites the currency symbol shown beside the rate when the currency changes', () => {
    cy.visit('/settings');

    // The rate label interpolates the symbol of the *selected* currency, so it
    // proves the two settings (Currency_Name and Currency_Symbol) stay in sync
    // - saving the name alone would leave the old symbol on screen.
    cy.contains('label', /electricity rate/i).should('contain.text', '$/kWh');

    // Selected by visible text, not by value: the options bind through
    // `[ngValue]`, so their DOM value is an Angular-generated index, not 'EUR'.
    cy.get('#preferred-currency').select('Euro - €');
    saveButtonFor(/save preferred currency/i).click();
    saveButtonFor(/save preferred currency/i).should('not.exist');

    cy.reload();

    cy.get('#preferred-currency')
      .find('option:selected')
      .should('include.text', 'Euro - €');
    cy.contains('label', /electricity rate/i).should('contain.text', '€/kWh');
  });

  it('applies the default diameter and price to a brand new material', () => {
    cy.visit('/settings');

    cy.get('#default-filament-diameter-mm').clear().type('2.85');
    saveButtonFor(/save default filament diameter/i).click();
    saveButtonFor(/save default filament diameter/i).should('not.exist');

    cy.get('#default-filament-price').clear().type('31.50');
    saveButtonFor(/save default filament price/i).click();
    saveButtonFor(/save default filament price/i).should('not.exist');

    // The payoff: a setting nobody reads is a setting that can silently break.
    // `/materials` resolves both values into the new-material form - the
    // diameter as an actual value, the price only as a placeholder (the form
    // deliberately leaves the price blank so a spool with no price stays
    // priceless rather than silently inheriting one).
    cy.visit('/materials');
    cy.get('#add-new-filament').click();

    cy.get('#edit-filament-diameter').should('have.value', '2.85');
    cy.get('#edit-filament-purchase-price')
      .should('have.value', '')
      .and('have.attr', 'placeholder', '31.50');
  });

  /**
   * Regression: "Save as Default Filament Price" wrote the price into the
   * *diameter* setting's row, so setting a default price silently corrupted the
   * default diameter (and threw outright when no diameter default existed).
   */
  it('saves a default price from the material form without clobbering the default diameter', () => {
    cy.visit('/settings');

    // Both Save buttons render only while the typed value differs from the
    // stored one, so the new values are derived from what is already there
    // rather than hardcoded - otherwise the test silently no-ops whenever the
    // stored value happens to match.
    cy.get('#default-filament-diameter-mm')
      .invoke('val')
      .then((currentDiameter) => {
        const diameter = String(currentDiameter) === '2.5' ? '1.75' : '2.5';

        cy.get('#default-filament-diameter-mm').clear().type(diameter);
        saveButtonFor(/save default filament diameter/i).click();
        saveButtonFor(/save default filament diameter/i).should('not.exist');

        // Give the price setting a known starting value here so the material
        // form always takes the update branch (the one that used to write to
        // the wrong row) rather than the create branch.
        cy.get('#default-filament-price')
          .invoke('val')
          .then((currentPrice) => {
            const seedPrice =
              String(currentPrice) === '19.00' ? '18.00' : '19.00';

            cy.get('#default-filament-price').clear().type(seedPrice);
            saveButtonFor(/save default filament price/i).click();
            saveButtonFor(/save default filament price/i).should('not.exist');
          });

        cy.visit('/materials');
        cy.get('#add-new-filament').click();

        // Waited on explicitly: the navigation below would otherwise abort the
        // in-flight write and the assertion would read the pre-save value.
        cy.intercept('PUT', '**/api/Users/me/user-settings').as(
          'updateSetting'
        );
        cy.get('#edit-filament-purchase-price').clear().type('42.00');
        cy.findByRole('button', {
          name: /save as default filament price/i,
        }).click();
        cy.wait('@updateSetting');

        cy.visit('/settings');
        cy.get('#default-filament-price').should('have.value', '42.00');
        cy.get('#default-filament-diameter-mm').should('have.value', diameter);
      });
  });

  it('switches the app to the dark theme and remembers it across a reload', () => {
    cy.visit('/settings');

    // Light is selected first rather than assumed: `cy.login()` caches the
    // session including localStorage, which is where the theme preference
    // lives, so a previous run could leave this session in dark mode.
    cy.get('#theme-mode').contains('button', /light/i).click();
    cy.get('html').should('not.have.class', 'dark-theme');

    cy.get('#theme-mode').contains('button', /dark/i).click();
    cy.get('html').should('have.class', 'dark-theme');

    // The theme is applied by a pre-paint script, so a reload is the only way
    // to prove the choice survives a full bootstrap rather than just living in
    // the running component.
    cy.reload();
    cy.get('html').should('have.class', 'dark-theme');

    cy.get('#theme-mode').contains('button', /light/i).click();
    cy.get('html').should('not.have.class', 'dark-theme');

    cy.reload();
    cy.get('html').should('not.have.class', 'dark-theme');
  });

  it('offers the free plan an upgrade route rather than billing management', () => {
    cy.visit('/settings');

    cy.contains('h2', 'Subscription')
      .parent()
      .within(() => {
        cy.contains(/free plan/i).should('exist');
        cy.findByRole('button', { name: /manage billing/i }).should(
          'not.exist'
        );
        cy.findByRole('button', { name: /upgrade to pro/i }).click();
      });

    cy.url().should('include', '/subscription');
  });

  it('keeps the deactivate button disabled until the agreement is checked', () => {
    cy.visit('/settings');

    cy.contains('summary', /delete account/i).click();

    cy.findByRole('button', { name: /deactivate account/i }).should(
      'be.disabled'
    );

    cy.contains('mat-checkbox', /i wish to proceed/i).click();

    cy.findByRole('button', { name: /deactivate account/i }).should(
      'not.be.disabled'
    );

    // Deliberately not clicked: deactivating the shared dev user would delete
    // the data every other spec in this suite depends on.
  });
});
