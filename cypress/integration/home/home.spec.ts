describe('Home Page', () => {
  before(() => {
    cy.visit('https://localhost:4200');
  });
  it('check the subtitle', () => {
    const expectedSubtitle = 'Log and analyze your 3D Prints';
    cy.get('[cy-subtitle]').invoke('text').should('equal', expectedSubtitle);
  });
});
