import { apiUrl } from '../../support/api-url';

/**
 * `/notifications` had no e2e coverage, and it is the one list in the app whose
 * rows carry state of their own - read vs unread - that the user changes by
 * looking at them. Filtering, marking read, and deleting all mutate that state
 * from three different controls, and the unread count feeds the toolbar badge
 * on every other page.
 *
 * The notifications under test are REAL. There is no endpoint that creates one,
 * so `cy.commentOnPrintAsOtherUser` makes a second dev user comment on a print
 * owned by the first, which is exactly what the API turns into a notification.
 * Stubbing the list would have been easier and would have tested the fixture
 * rather than the feature - the interesting half here is that a comment made
 * somewhere else shows up as an actionable row that links back to the print.
 */
describe('Notifications', () => {
  let printId: number;
  let printTitle: string;

  beforeEach(() => {
    cy.login();

    // A fresh print PER TEST, not one for the whole spec. Every comment
    // notification reads "<user> commented on <print title>", so notifications
    // left behind by earlier tests in this file would be indistinguishable from
    // this test's own - and `fixtureCard` would silently act on the wrong row.
    // The seeded title carries a timestamp, which makes the match unambiguous.
    cy.seedPublicPrintFixture().then((print: any) => {
      printId = print.id;
      printTitle = print.title;
    });
  });

  /** The row for a notification about THIS test's print. */
  const fixtureCard = () => cy.contains('.notification-card', printTitle);

  it('surfaces a comment from another user as an unread notification', () => {
    cy.commentOnPrintAsOtherUser(printId, 'Notification probe comment');

    cy.visit('/notifications');

    fixtureCard()
      .should('be.visible')
      .within(() => {
        cy.contains(/new comment on your print/i).should('be.visible');
        // Unread is a class on the card and a dot inside it; both are what the
        // "unread only" filter and the toolbar badge are derived from.
        cy.get('.unread-indicator').should('exist');
      });
    fixtureCard().should('have.class', 'unread');
  });

  it('links back to the print that triggered it', () => {
    cy.commentOnPrintAsOtherUser(printId, 'Notification link comment');

    cy.visit('/notifications');

    // The payoff of the whole feature: the row is a way back to the thing that
    // happened, not just an announcement that it did.
    fixtureCard().find('a.notification-link').first().click();

    cy.location('pathname').should('eq', `/prints/${printId}`);
    cy.contains('h1', printTitle).should('be.visible');
  });

  it('hides read notifications behind the unread-only filter', () => {
    cy.commentOnPrintAsOtherUser(printId, 'Notification filter comment');

    cy.intercept('PUT', '**/api/notifications/*/read').as('markRead');
    cy.visit('/notifications');

    // Present before the filter is touched, so the disappearance below is
    // attributable to the filter rather than to the row never being there.
    fixtureCard().should('exist');

    cy.findByRole('switch', { name: /show unread only/i }).click();
    fixtureCard().should('exist').and('have.class', 'unread');

    // Opening it marks it read; coming back, the unread-only list no longer
    // has it while the unfiltered list still does.
    fixtureCard().find('a.notification-link').first().click();
    cy.wait('@markRead');

    cy.visit('/notifications');
    cy.findByRole('switch', { name: /show unread only/i }).click();
    cy.contains('.notification-card', printTitle).should('not.exist');

    cy.findByRole('switch', { name: /show unread only/i }).click();
    fixtureCard().should('exist').and('not.have.class', 'unread');
  });

  it('clears the unread state of every notification at once', () => {
    cy.commentOnPrintAsOtherUser(printId, 'Notification mark-all comment');

    cy.intercept('PUT', '**/api/notifications/read-all').as('markAllRead');
    cy.visit('/notifications');

    fixtureCard().should('have.class', 'unread');

    cy.findByRole('button', { name: /mark all read/i }).click();
    cy.wait('@markAllRead');

    // Asserted against the API as well as the DOM: the toolbar badge on every
    // other page is driven by this count, not by the list.
    cy.request({
      method: 'GET',
      url: `${apiUrl()}/api/notifications/unread-count`,
      headers: { 'X-Dev-User-Id': '1' },
    })
      .its('body.unreadCount')
      .should('eq', 0);

    cy.get('.notification-card.unread').should('not.exist');
    cy.findByRole('button', { name: /mark all read/i }).should('not.exist');
  });

  it('deletes a single notification without touching the rest', () => {
    cy.commentOnPrintAsOtherUser(printId, 'Notification delete comment');

    cy.intercept('DELETE', '**/api/notifications/*').as('deleteNotification');
    cy.visit('/notifications');

    fixtureCard()
      .should('exist')
      .within(() => {
        cy.get('button.delete-button').click();
      });
    cy.wait('@deleteNotification');

    // Identified by row rather than by count. The list is paged, so removing
    // one row pulls the next notification up into its place and the total on
    // screen is unchanged - a count assertion here passes or fails on
    // pagination, not on the delete.
    cy.contains('.notification-card', printTitle).should('not.exist');

    // ...and the rest of the list survived, which is what separates this
    // button from the "Delete all" sitting next to it.
    cy.get('.notification-card').should('have.length.greaterThan', 0);

    cy.reload();
    cy.contains('.notification-card', printTitle).should('not.exist');
    cy.get('.notification-card').should('have.length.greaterThan', 0);
  });
});
