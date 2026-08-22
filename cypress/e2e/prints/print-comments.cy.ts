import { apiUrl } from '../../support/api-url';

/**
 * The comment flow was written as an e2e test years ago and left commented out
 * in `prints.cy.ts`, so nothing covered it. It is worth covering for a reason
 * the print specs do not reach: comments are the one part of a public print
 * page whose controls differ by viewer. The owner gets a compose box and a
 * delete menu; an anonymous visitor must get a prompt to log in and no way to
 * post - and that logged-out branch only renders for a visitor with no Auth0
 * session at all.
 */
describe('Print comments', () => {
  let printId: number;

  before(() => {
    cy.seedPublicPrintFixture().then((print) => {
      printId = print.id;
    });
  });

  describe('as the print owner', () => {
    beforeEach(() => {
      cy.login();
    });

    it('adds a comment and removes it again', () => {
      const body = 'E2E comment - ' + new Date().getTime();

      cy.intercept('POST', '**/api/Prints/*/comment').as('addComment');
      cy.visit(`/prints/${printId}`);

      cy.get('#add-comment-textarea').type(body);
      cy.get('#btn-add-print-comment').click();
      cy.wait('@addComment');

      cy.contains('.comment', body).should('be.visible');

      // The compose box must reset, otherwise the next Add Comment click posts
      // the previous text a second time.
      cy.get('#add-comment-textarea').should('have.value', '');

      // Stored, not just appended to the local array.
      cy.reload();
      cy.contains('.comment', body).should('be.visible');

      cy.intercept('DELETE', '**/api/Prints/*/comment/*').as('deleteComment');

      // The offset keeps the menu button clear of the sticky toolbar: a plain
      // scrollIntoView parks the comment directly underneath it and Cypress
      // then refuses the click as "hidden from view".
      cy.contains('.comment', body)
        .scrollIntoView({ offset: { top: -150, left: 0 } })
        .within(() => {
          cy.get('[data-cy-more-button]').click();
        });

      // Scoped to the open panel rather than the document: the detail page has
      // its own overflow menu, and an unscoped menuitem query can resolve
      // before this menu has finished opening.
      //
      // `force` is for the menu item alone. The panel is a CDK overlay that is
      // still animating into place when the item becomes queryable, so
      // Cypress's covered-element check reads the item as obscured by its own
      // overlay - visibility here is asserted on the panel instead.
      cy.get('.mat-mdc-menu-panel')
        .should('be.visible')
        .within(() => {
          cy.findByRole('menuitem', { name: /delete/i }).click({ force: true });
        });
      cy.wait('@deleteComment');

      // Regression: the row used to stay on screen here. Deleting spliced the
      // comment out of this component's input array, which under the parent's
      // OnPush change detection repainted nothing - the comment vanished only
      // on the next full page load.
      cy.contains('.comment', body).should('not.exist');

      // Gone from the server too, not just from the parent's signal.
      cy.request({
        method: 'GET',
        url: `${apiUrl()}/api/Prints/${printId}`,
        headers: { 'X-Dev-User-Id': '1' },
      }).then(({ body: print }) => {
        expect(
          print.comments.map((c: { body: string }) => c.body)
        ).to.not.include(body);
      });

      cy.reload();
      cy.contains('.comment', body).should('not.exist');
    });

    it('hides the comment section entirely when the print disallows comments', () => {
      // Flipped through the API rather than the edit form: this test is about
      // how the detail page reads the flag, not about the form that sets it.
      cy.request({
        method: 'GET',
        url: `${apiUrl()}/api/Prints/${printId}`,
        headers: { 'X-Dev-User-Id': '1' },
      }).then(({ body: print }) => {
        cy.request({
          method: 'PUT',
          url: `${apiUrl()}/api/Prints/${printId}`,
          headers: { 'X-Dev-User-Id': '1' },
          body: { ...print, allowComments: false },
        });

        cy.visit(`/prints/${printId}`);
        cy.contains(/comments are disabled for this print/i).should(
          'be.visible'
        );
        cy.get('#add-comment-textarea').should('not.exist');

        // Put it back so the anonymous test below still has a comment section.
        cy.request({
          method: 'PUT',
          url: `${apiUrl()}/api/Prints/${printId}`,
          headers: { 'X-Dev-User-Id': '1' },
          body: { ...print, allowComments: true },
        });
      });
    });
  });

  describe('as an anonymous visitor', () => {
    // Deliberately no cy.login(): `?devUserId=anonymous` is what makes the
    // logged-out branch reachable without an Auth0 session (see AGENTS.md).
    it('is invited to log in instead of being given a compose box', () => {
      cy.visit(`/prints/${printId}?devUserId=anonymous`);

      cy.contains(/please log in to add comments/i).should('be.visible');
      cy.get('#add-comment-textarea').should('not.exist');
      cy.get('#btn-add-print-comment').should('not.exist');
    });
  });
});
