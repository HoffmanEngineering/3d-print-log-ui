// A logged-out visitor opening another maker's achievements at /users/:id/achievements must see
// the page render, never get bounced to / (#66). The API answers a Friends-only or Private
// profile with an empty result rather than an error, so the empty state is the second case.
//
// Uses the dev-only anonymous simulation (?devUserId=anonymous) and deliberately does NOT call
// cy.login(). The achievements endpoints are stubbed: what is under test is the public route,
// not the API's visibility rules (PublicAchievementsTests covers those).

describe('Anonymous public achievements', () => {
  const userId = 4242;

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.intercept('GET', '**/api/achievements/catalog', {
      fixture: 'achievements/catalog.json',
    }).as('catalog');
  });

  it('renders earned badges without redirecting home', () => {
    cy.intercept('GET', `**/api/users/${userId}/achievements`, {
      fixture: 'achievements/public-earned.json',
    }).as('earned');

    cy.visit(`/users/${userId}/achievements?devUserId=anonymous`);
    cy.wait(['@catalog', '@earned']);

    cy.location('pathname').should('eq', `/users/${userId}/achievements`);
    cy.contains('h1', 'Achievements').should('be.visible');
    cy.contains('3 tiers earned').should('be.visible');
    cy.get('app-achievement-grid').should('be.visible');
    cy.get('[data-key="first-print"] app-achievement-badge').should(
      'not.have.class',
      'locked'
    );
    cy.get('[data-key="octoprint"] app-achievement-badge').should(
      'have.class',
      'locked'
    );
    // Public pages carry no progress.
    cy.get('mat-progress-bar').should('not.exist');
  });

  it('renders the empty state for a profile with nothing visible', () => {
    cy.intercept('GET', `**/api/users/${userId}/achievements`, {
      fixture: 'achievements/public-empty.json',
    }).as('empty');

    cy.visit(`/users/${userId}/achievements?devUserId=anonymous`);
    cy.wait('@empty');

    cy.location('pathname').should('eq', `/users/${userId}/achievements`);
    cy.contains('No achievements to show yet.').should('be.visible');
    cy.get('app-achievement-grid').should('not.exist');
  });
});
