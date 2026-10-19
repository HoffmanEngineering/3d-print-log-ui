import { apiUrl } from '../../support/api-url';

/**
 * The new-user path end to end: a brand-new account with no printers lands on
 * /welcome instead of an empty print list, adds a printer from the quick-add
 * form, skips the material step, and goes straight to a pre-filled print form.
 * Saving that first print finishes onboarding, so the getting-started
 * checklist no longer shows on /prints.
 *
 * Each run uses a dev user id no earlier run has seen. The API's dev bypass
 * creates the user on its first request, so it starts with no printers, no
 * prints and no onboarding settings. Eligibility is stubbed rather than taken
 * from the API, because it depends on `Onboarding:LaunchDate`, which is off
 * (null) unless the API was started with one.
 */
const ACHIEVEMENTS_CELEBRATIONS = 18; // UserSettingType.Achievements_Celebrations

// Shaped like PrinterModel in printer-catalog.service.ts (not imported: it pulls Angular into the Cypress build).
const p1s = {
  id: 'bambu-lab-p1s',
  make: 'Bambu Lab',
  model: 'P1S',
  technology: 'FFF',
  bedWidthMm: 256,
  bedDepthMm: 256,
  bedHeightMm: 256,
  nozzleOptionsMm: [0.4],
  defaultNozzleMm: 0.4,
  filamentDiameterMm: 1.75,
  hasHeatedBed: true,
  hasHeatedChamber: true,
  extruderCount: 1,
  defaultSlotCount: 4,
  kinematics: 'corexy',
  retired: false,
};

describe('New-user onboarding', () => {
  let devUserId: string;

  beforeEach(() => {
    // Fresh per test (and per retry), well above the seeded dev users. The API's dev bypass
    // takes any id ("dev|<id>"); this one stays inside a 32-bit int all the same.
    devUserId = String(900_000 + (Date.now() % 1e9));
    cy.login();

    // cy.login() turns celebrations off for dev user 1 only. Without this the
    // first-printer and first-print badges would open their dialog over the
    // page for this user. The request also creates the user.
    cy.request({
      method: 'POST',
      url: `${apiUrl()}/api/Users/me/user-settings`,
      headers: { 'X-Dev-User-Id': devUserId },
      body: { userSettingTypeId: ACHIEVEMENTS_CELEBRATIONS, value: 'off' },
    });

    cy.intercept('GET', '**/api/Users/me/onboarding', {
      body: {
        onboardingEligible: true,
        createdDate: new Date().toISOString(),
        emailVerified: true,
      },
    }).as('onboardingStatus');

    // The catalog is stubbed, so the test does not depend on a seeded catalog.
    cy.intercept('GET', '**/api/PrinterModels/popular*', {
      body: [p1s],
    });
    cy.intercept('GET', '**/api/PrinterModels?search=*', { body: [p1s] });
    cy.intercept('GET', '**/api/PrinterModels/match*', { statusCode: 204 });
    cy.intercept('GET', '**/api/PrinterModels/bambu-lab-p1s', { body: p1s });
    // A pass-through spy: the API creates the printer for real.
    cy.intercept('POST', '**/api/Printers*').as('createPrinter');
  });

  it('takes a new user from /welcome to their first print', () => {
    cy.visit(`/prints?devUserId=${devUserId}`);
    cy.location('pathname').should('eq', '/welcome');
    cy.findByRole('heading', { name: 'Welcome to 3D Print Log' }).should(
      'be.visible'
    );

    // Step 1: a popular chip fills the specs from the catalog, and the saved
    // printer carries them with the catalog model id. "Add printer and
    // continue" saves and moves on to step 2.
    cy.findByRole('heading', { name: 'Which printer do you have?' }).should(
      'be.visible'
    );
    cy.get('[data-testid="quick-add-printer"]').within(() => {
      cy.get('[data-testid="popular-printer-bambu-lab-p1s"]').click();
      cy.get('[data-testid="picked-printer-name"]').should(
        'have.text',
        'Bambu Lab P1S'
      );
      cy.get('[data-testid="spec-summary"]').should('contain.text', '256');
      cy.get('[data-testid="quick-add-save"]')
        .should('be.enabled')
        .and('contain.text', 'Add printer and continue')
        .click();
    });
    cy.wait('@createPrinter').then(({ request, response }) => {
      expect(response?.statusCode).to.be.lessThan(300);
      expect(request.body).to.have.property('bedWidthMm', 256);
      expect(request.body).to.have.property('catalogModelId', 'bambu-lab-p1s');
      // The API kept the link, not just the request.
      expect(response?.body?.catalogModelId).to.equal('bambu-lab-p1s');
    });
    cy.get('[data-testid="printer-chips"]').should('contain.text', 'P1S');

    // Step 2 is optional.
    cy.get('[data-testid="step2-skip"]').should('be.visible').click();

    // Step 3: the manual path opens the print form in onboarding mode.
    cy.get('[data-testid="path-manual-action"]').should('be.visible').click();

    cy.location('pathname').should('eq', '/prints/new/edit');
    cy.location('search').should('include', 'onboarding=1');
    cy.get('#edit-print-title').should('have.value', 'My first print');
    cy.get('#edit-print-printer').should('contain.text', 'P1S');

    cy.intercept('POST', '**/api/Prints*').as('createPrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@createPrint').its('response.statusCode').should('be.lt', 300);

    cy.location('pathname').should('eq', '/prints');
    cy.contains('[cy-print-row]', 'My first print').should('be.visible');
    // The first-print badge is earned, so the checklist gives way to the
    // next-achievement hint. Waiting for the hint first means the slot has
    // decided, so the absence check below is not satisfied by an empty slot.
    cy.contains('app-next-achievement-hint', 'Next achievement:').should(
      'be.visible'
    );
    cy.get('app-getting-started-checklist').should('not.exist');
    // The welcome flow acknowledged the email notice inline, so the global
    // banner must not come back on /prints.
    cy.get('[data-testid="email-notice"]').should('not.exist');
  });

  it('saves free text that is not in the catalog', () => {
    cy.intercept('GET', '**/api/PrinterModels/popular*', { body: [] });
    cy.intercept('GET', '**/api/PrinterModels?search=*', { body: [] });

    cy.visit(`/welcome?devUserId=${devUserId}`);

    // The manual path: make and model by hand, and the nickname follows the model.
    // "Save and add another" saves and brings back an empty form.
    cy.get('[data-testid="quick-add-printer"]').within(() => {
      cy.get('[data-testid="manual-toggle"]')
        .should('contain.text', "Can't find yours? Enter it manually")
        .click();
      cy.findByLabelText('Make').type('Prusa');
      cy.findByLabelText('Model').type('i3 MK3S');
      cy.findByLabelText('Nickname').should('have.value', 'i3 MK3S');
      cy.get('[data-testid="quick-add-save-another"]')
        .should('be.enabled')
        .click();
    });
    cy.wait('@createPrinter').then(({ request, response }) => {
      expect(response?.statusCode).to.be.lessThan(300);
      expect(request.body.catalogModelId ?? null).to.equal(null);
    });
    cy.get('[data-testid="printer-chips"]').should('contain.text', 'i3 MK3S');
    // Nothing new is entered, so the primary only continues.
    cy.get('[data-testid="printer-search"]').should('have.value', '');
    cy.get('[data-testid="quick-add-save-another"]').should('not.exist');
    cy.get('[data-testid="quick-add-save"]')
      .should('contain.text', 'Continue')
      .and('not.contain.text', 'Add printer')
      .click();
    cy.get('[data-testid="step2-skip"]').should('be.visible');
  });
});
