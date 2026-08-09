// #66 failure mode: a rejected resolver cancels navigation and bounces the
// visitor to /. The print detail route resolves a user summary and four user
// settings alongside the print itself; none of them may reject.
//
// The cy.wait('@alias') calls are load-bearing: without them a mistyped glob
// silently turns either test into a no-op.

const API = 'https://localhost:5001';
const ANON_HEADERS = { 'allow-anonymous-request': 'true' };

describe('Anonymous public print with a failing side-channel endpoint', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
  });

  // NOTE: the settings-failure case is deliberately NOT tested anonymously.
  // For a logged-out visitor, AuthInterceptorService throws
  // missing_refresh_token before the request is dispatched, and
  // UserSettingService already swallows exactly that error — so no settings
  // request ever leaves the browser and the intercept would never fire. Such a
  // test would pass identically before and after the resolver hardening,
  // proving nothing. The settings resolvers' `.catch(() => null)` protects the
  // SIGNED-IN visitor, whose request does go out and can genuinely 500; that is
  // covered by the logged-in test below and by the resolver unit tests.

  // A missing print is the case the not-found view exists for, and it was the
  // one case that could not reach it: getPrintDetail errored, the resolver
  // rejected, and the router cancelled navigation.
  it('shows the not-found view instead of bouncing home for a missing print', () => {
    cy.visit('/prints/999999999?devUserId=anonymous');

    cy.location('pathname').should('eq', '/prints/999999999');
    cy.contains('h1', /print not found/i).should('be.visible');
  });

  it('still renders when the user-summary endpoint returns 404', () => {
    cy.intercept('GET', '**/api/Users/*/summary', {
      statusCode: 404,
      body: {},
    }).as('userSummary');

    cy.request({
      method: 'GET',
      url: `${API}/api/Prints/public`,
      headers: ANON_HEADERS,
    }).then((resp) => {
      const id = resp.body[0];
      cy.visit(`/prints/${id}?devUserId=anonymous`);

      cy.wait('@userSummary'); // fail loudly if the intercept never fires
      cy.location('pathname').should('eq', `/prints/${id}`);
      cy.get('h1').should('be.visible');
    });
  });
});

describe('Signed-in print detail with a failing settings endpoint', () => {
  it('still renders when user-settings returns 500', () => {
    cy.login();

    // Create the print rather than clicking whatever card happens to be first
    // — the dev-bypass user is not guaranteed to own any seeded print.
    const title = `Settings failure print ${Date.now()}`;
    cy.createPrint(title);

    // Registered after createPrint so the print editor's own settings loads
    // are unaffected; only the detail navigation sees the 500.
    cy.intercept('GET', '**/api/Users/me/user-settings', {
      statusCode: 500,
      body: {},
    }).as('settings');

    cy.visit('/prints');
    // Scoped to the desktop table row: a bare cy.contains(title) matches the
    // hidden mobile-card copy of the same print first, which is not clickable.
    cy.contains('[cy-print-row]', title).find('.mat-column-title').click();

    cy.wait('@settings'); // proves the intercept is reachable
    cy.location('pathname').should('match', /\/prints\/\d+$/);
    cy.get('h1').should('be.visible');
  });
});
