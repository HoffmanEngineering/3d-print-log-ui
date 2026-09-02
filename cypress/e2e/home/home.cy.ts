describe('Home Page', () => {
  it('shows the hero and the signup CTA to a logged-out visitor', () => {
    // No cy.login(). The home page's primary audience is signed out, and the
    // old version of this spec logged in first, so that path was never covered.
    cy.visit('/?devUserId=anonymous');

    cy.get('h1').should('have.length', 1);
    cy.get('h1').should('contain.text', 'Every print');
    // Trimmed: the CTA is a <button> whose text node is indented in the
    // template, so an exact `have.text` would compare against the whitespace.
    cy.get('[data-cy="hero-signup"]')
      .invoke('text')
      .invoke('trim')
      .should('equal', 'Create a free account');
  });

  it('links to every slicer guide', () => {
    cy.visit('/?devUserId=anonymous');

    for (const route of [
      '/orcaslicer',
      '/bambu-studio',
      '/prusaslicer',
      '/creality-print',
      '/cura',
    ]) {
      cy.get(`a[href="${route}"]`).should('exist');
    }
  });

  it('still renders for a signed-in visitor', () => {
    cy.login();
    cy.visit('/');

    cy.get('[data-cy="closing-signup"]').should('exist');
  });
});
