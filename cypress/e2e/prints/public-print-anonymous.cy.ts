// Regression for #66: a logged-out visitor deep-linking to a public print at
// /prints/:id must see it render, not get bounced to /.
//
// Uses the dev-only anonymous simulation (?devUserId=anonymous). Requires the
// dev server + dev API running with at least one public print seeded.
// Deliberately does NOT call cy.login().

const API = 'https://localhost:5001';
const ANON_HEADERS = { 'allow-anonymous-request': 'true' };

describe('Anonymous public print view', () => {
  it('renders a public print for a logged-out visitor without redirecting home', () => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());

    // Discover a public print id anonymously. GET /api/Prints/public is the
    // AllowAnonymous endpoint the sitemap uses; it returns an array of ids.
    cy.request({
      method: 'GET',
      url: `${API}/api/Prints/public`,
      headers: ANON_HEADERS,
    }).then((idsResp) => {
      expect(idsResp.status).to.eq(200);
      expect(
        idsResp.body,
        'at least one public print exists'
      ).to.have.length.greaterThan(0);

      const id = idsResp.body[0];

      // Fetch the print detail (also AllowAnonymous) to know its title.
      cy.request({
        method: 'GET',
        url: `${API}/api/Prints/${id}`,
        headers: ANON_HEADERS,
      }).then((printResp) => {
        expect(printResp.status).to.eq(200);
        const title = printResp.body.title;

        // Visit the deep link as an anonymous (logged-out) visitor.
        cy.visit(`/prints/${id}?devUserId=anonymous`);

        // 1) No bounce to home.
        cy.location('pathname').should('eq', `/prints/${id}`);

        // 2) Print content rendered (title appears on the page).
        cy.contains(title).should('be.visible');
      });
    });
  });
});
