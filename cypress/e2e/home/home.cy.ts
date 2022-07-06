describe('Home Page', () => {
  beforeEach(() => {
    cy.login();
  });
  it('check the subtitle', () => {
    cy.visit('/');

    const expectedSubtitle = 'Log and analyze your 3D Prints';
    cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
  });
});
