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
  });

  it('takes a new user from /welcome to their first print', () => {
    cy.visit(`/prints?devUserId=${devUserId}`);
    cy.location('pathname').should('eq', '/welcome');
    cy.findByRole('heading', { name: 'Welcome to 3D Print Log' }).should(
      'be.visible'
    );

    // Step 1: free text that isn't in the catalog is split on blur into make
    // ("Prusa") and model ("i3 MK3S"), and the name follows the model.
    cy.intercept('POST', '**/api/Printers*').as('createPrinter');
    cy.get('[data-testid="quick-add-printer"]').within(() => {
      cy.findByLabelText('Printer make and model').type('Prusa i3 MK3S').blur();
      cy.findByLabelText('Name').should('have.value', 'i3 MK3S');
      cy.get('[data-testid="quick-add-save"]').should('be.enabled').click();
    });
    cy.wait('@createPrinter').its('response.statusCode').should('be.lt', 300);
    cy.get('[data-testid="printer-chips"]').should('contain.text', 'i3 MK3S');

    cy.get('[data-testid="step1-continue"]').should('be.enabled').click();

    // Step 2 is optional.
    cy.get('[data-testid="step2-skip"]').should('be.visible').click();

    // Step 3: the manual path opens the print form in onboarding mode.
    cy.get('[data-testid="path-manual-action"]').should('be.visible').click();

    cy.location('pathname').should('eq', '/prints/new/edit');
    cy.location('search').should('include', 'onboarding=1');
    cy.get('#edit-print-title').should('have.value', 'My first print');
    cy.get('#edit-print-printer').should('contain.text', 'i3 MK3S');

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
});
