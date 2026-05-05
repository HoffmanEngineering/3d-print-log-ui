Cypress.Commands.add('login', () => {
  cy.session('dev-bypass', () => {
    cy.visit('/');
  });
});
