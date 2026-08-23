import { apiUrl } from '../../support/api-url';

/**
 * `/users/:id` is the app's other public route, and it had no e2e coverage.
 *
 * It matters for the reason AGENTS.md calls out around #66: it is still
 * resolver-gated, and a rejected resolver cancels navigation. `/prints/:id` had
 * its resolver removed and has a regression spec for exactly this; the profile
 * route kept its own, so the same failure mode is live here and only reproduces
 * for a visitor with no session at all. `UserDetailResolverService` catches the
 * rejection and redirects to `/users/not-found`, which is the behavior these
 * tests pin - a regression that dropped that catch would bounce logged-out
 * visitors to `/` instead, silently, and only in production.
 *
 * The dev user's profile is seeded with a real display name and bio first. The
 * seeded user has neither, so without that the "the profile rendered" checks
 * would be assertions about two empty strings. Restored in `after`.
 */
describe('Public user profile', () => {
  const PROFILE_ID = 1;
  const displayName = 'E2E Profile';
  const bio = 'Bio seeded by public-profile.cy.ts';

  // ProfileViewStatus, which the API takes as its numeric value.
  const PUBLIC = 1;
  const PRIVATE = 4;

  let profileSnapshot: Record<string, unknown> | null = null;

  before(() => {
    cy.request({
      method: 'GET',
      url: `${apiUrl()}/api/Users/${PROFILE_ID}`,
      headers: { 'X-Dev-User-Id': '1' },
    }).then(({ body }) => {
      profileSnapshot = body;
    });

    cy.patchUserProfile({ displayName, bio, viewStatus: PUBLIC });
  });

  after(() => {
    if (profileSnapshot) {
      cy.patchUserProfile(profileSnapshot);
    }
  });

  describe('as an anonymous visitor', () => {
    // Deliberately no cy.login(). `?devUserId=anonymous` is what makes the
    // logged-out branch reachable without an Auth0 session (see AGENTS.md), and
    // it persists in sessionStorage for the tab.
    beforeEach(() => {
      cy.clearLocalStorage();
    });

    it('renders a public profile instead of redirecting away', () => {
      cy.visit(`/users/${PROFILE_ID}?devUserId=anonymous`);

      // The regression itself: still on the profile, not bounced to `/` and not
      // diverted to the not-found page.
      cy.location('pathname').should('eq', `/users/${PROFILE_ID}`);

      // Positive assertions first, so the owner-control checks below are about
      // a page that demonstrably rendered its content.
      cy.contains('h2', displayName).should('be.visible');
      cy.contains(bio).should('be.visible');
    });

    it('withholds every owner-only control', () => {
      cy.visit(`/users/${PROFILE_ID}?devUserId=anonymous`);
      cy.contains('h2', displayName).should('be.visible');

      // Non-vacuous because the companion test below proves each of these is
      // present for the owner on this very same profile.
      cy.findByRole('button', { name: /edit display name/i }).should(
        'not.exist'
      );
      cy.findByRole('button', { name: /edit bio/i }).should('not.exist');
      cy.findByRole('button', { name: /cover photo/i }).should('not.exist');
      cy.get('#profile-visibility').should('not.exist');

      // Deliberately NOT asserted: `#profile-photo-input` and
      // `#cover-photo-input`. Only the buttons that open them are gated on
      // ownership - the hidden file inputs themselves render for every visitor.
      // They are `display: none` with no reachable trigger, and their change
      // handlers post to `Users/me` endpoints that require auth, so this is
      // dead markup rather than an exposed control. Asserting their absence
      // would simply be asserting something that is not true.
    });

    describe('and the profile is private', () => {
      // Restored in afterEach rather than at the end of the test body: a failed
      // assertion would otherwise leave the dev user's profile private for
      // every spec that runs afterwards.
      beforeEach(() => cy.patchUserProfile({ viewStatus: PRIVATE }));
      afterEach(() => cy.patchUserProfile({ viewStatus: PUBLIC }));

      it('explains it cannot be shown rather than bouncing home', () => {
        cy.visit(`/users/${PROFILE_ID}?devUserId=anonymous`);

        cy.location('pathname').should('eq', '/users/not-found');
        cy.contains(
          /user cannot be found, or their profile is marked as private/i
        ).should('be.visible');

        // The distinction that matters: `/` would mean the rejected resolver
        // cancelled navigation and the app fell back to the homepage.
        cy.location('pathname').should('not.eq', '/');
      });
    });

    it('shows the not-found view for a user id that does not exist', () => {
      cy.visit('/users/999999?devUserId=anonymous');

      cy.location('pathname').should('eq', '/users/not-found');
      cy.contains(/user cannot be found/i).should('be.visible');
    });
  });

  describe('as the profile owner', () => {
    beforeEach(() => {
      cy.login();
    });

    it('offers the owner-only controls the anonymous visitor is denied', () => {
      // `?devUserId=` (empty) clears the override an earlier anonymous test
      // persisted to sessionStorage for this tab. Without it this test can
      // silently run as the anonymous visitor and assert the opposite of what
      // it means to.
      cy.visit(`/users/${PROFILE_ID}?devUserId=`);

      cy.contains('h2', displayName).should('be.visible');

      cy.findByRole('button', { name: /edit display name/i }).should('exist');
      cy.findByRole('button', { name: /edit bio/i }).should('exist');
      cy.get('#profile-visibility').should('exist');
    });

    it('saves an edited bio and keeps it after a reload', () => {
      const updatedBio = 'Updated bio - ' + new Date().getTime();

      cy.intercept('PUT', '**/api/Users/me').as('updateProfile');
      cy.visit(`/users/${PROFILE_ID}?devUserId=`);

      cy.findByRole('button', { name: /edit bio/i }).click();
      cy.get('.mat-mdc-form-field textarea').clear().type(updatedBio);
      cy.findByRole('button', { name: /^submit$/i }).click();
      cy.wait('@updateProfile');

      // The editor closes and the new text is what the profile now shows.
      cy.findByRole('button', { name: /edit bio/i }).should('exist');
      cy.contains(updatedBio).should('be.visible');

      cy.reload();
      cy.contains(updatedBio).should('be.visible');
    });
  });
});
