// The page unsubscribe and manage links from emails land on. Public and token-authenticated,
// so this deliberately does NOT call cy.login(): a visitor from an email is usually signed out.
// `?devUserId=anonymous` matters: without it the dev auth bypass signs in a mock user.
//
// Every email endpoint is intercepted, so this needs no seeded data, only the app.

/** version 1, purpose 1 (unsubscribe), user 300, category 24 (monthly recap). */
const RECAP_UNSUB_TOKEN = 'AQGsAhgAGyw9.c2ln';

describe('Email preferences (signed out)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('confirms a one-click unsubscribe and removes the token from the URL', () => {
    cy.intercept('POST', '**/api/email/unsubscribe/confirm', (req) => {
      expect(req.headers['x-email-token']).to.eq(RECAP_UNSUB_TOKEN);
      expect(req.headers['authorization']).to.be.undefined;
      req.reply({ category: 24 });
    }).as('confirm');

    cy.visit(`/email-preferences?devUserId=anonymous#u=${RECAP_UNSUB_TOKEN}`);

    cy.contains('Unsubscribe from monthly recaps?').should('be.visible');
    cy.location('hash').should('eq', '');

    cy.get('[data-testid="email-unsubscribe-confirm"]').click();
    cy.wait('@confirm');

    cy.contains("You're unsubscribed from monthly recaps.").should(
      'be.visible'
    );
    cy.location('pathname').should('eq', '/email-preferences');
    cy.location('hash').should('eq', '');
  });

  it('loads and saves preferences from a manage link', () => {
    cy.intercept('GET', '**/api/email/preferences', {
      maskedEmail: 'a•••@example.com',
      all: true,
      onboarding: true,
      monthlyRecap: true,
      printerSilent: true,
    }).as('read');
    cy.intercept('PUT', '**/api/email/preferences', (req) => {
      expect(req.body.monthlyRecap).to.eq(false);
      req.reply({ maskedEmail: 'a•••@example.com', ...req.body });
    }).as('update');

    cy.visit('/email-preferences?devUserId=anonymous#m=MANAGE');
    cy.wait('@read');
    cy.location('hash').should('eq', '');

    cy.contains('a•••@example.com').should('be.visible');
    cy.contains('Monthly recap').click();
    cy.get('[data-testid="email-preferences-save"]').click();
    cy.wait('@update');
    cy.get('[data-testid="email-preferences-saved"]').should('be.visible');
  });

  it('explains an expired link', () => {
    cy.intercept('GET', '**/api/email/preferences', { statusCode: 400 });

    cy.visit('/email-preferences?devUserId=anonymous#m=EXPIRED');

    cy.get('[data-testid="email-preferences-invalid"]').should('be.visible');
  });
});
