describe('Capture home screenshots', () => {
  it('runs under the capture config at 2x', () => {
    cy.login();
    cy.visit('/');
    cy.window().its('devicePixelRatio').should('eq', 2);
  });
});
