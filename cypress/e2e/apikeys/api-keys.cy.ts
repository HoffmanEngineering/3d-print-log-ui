/**
 * API keys are the one credential this app hands the user, and `/api-keys` had
 * no e2e coverage. The property that matters is show-once: the secret comes
 * back from the create call and never again. A regression that hides it at
 * creation leaves the user with an unusable key; one that keeps serving it
 * afterwards means the server is storing a credential it promises not to. The
 * second half is checked against the list response as well as the rendered
 * mask, so a secret leaking back under any field still fails the test.
 */
describe('API Keys', () => {
  beforeEach(() => {
    cy.login();
  });

  // The create button's id is `add-new-filament` - a copy/paste from the
  // filament list, not a filament control.
  const createKeyButton = () => cy.get('#add-new-filament');

  const describedRow = (description: string) =>
    cy.contains('[data-cy-filament-row]', description);

  it('shows a new key exactly once and masks it after a reload', () => {
    const description = 'E2E key - ' + new Date().getTime();

    cy.intercept('POST', '**/api/UserApiKeys').as('createKey');
    cy.visit('/api-keys');

    createKeyButton().click();
    cy.get('.new-key textarea').type(description);
    cy.findByRole('button', { name: /^submit$/i }).click();

    let secret = '';

    cy.wait('@createKey').then(({ response }) => {
      secret = response.body.publicKey;
      expect(secret, 'the create response carries the secret').to.be.a('string')
        .and.not.be.empty;

      describedRow(description).within(() => {
        cy.get('input').should('have.value', secret);
      });
    });

    cy.contains(/make sure you copy this key now/i).should('be.visible');

    // Asserted on the payload, not just on the asterisks: a mask is a UI
    // decision, and this is about what the server hands back.
    cy.intercept('GET', '**/api/UserApiKeys').as('listKeys');
    cy.reload();
    cy.wait('@listKeys').then(({ response }) => {
      cy.wrap(JSON.stringify(response.body)).should('not.contain', secret);
    });

    describedRow(description).within(() => {
      // Masked, and masked with literal asterisks rather than a truncated key.
      cy.get('input')
        .should('have.value', '******************************')
        .and('be.disabled');
    });
    cy.contains(/make sure you copy this key now/i).should('not.exist');

    // Revoked afterwards so the spec does not leave a live credential behind on
    // the shared dev user every time it runs.
    describedRow(description).within(() => {
      cy.findByRole('button', { name: /delete api key/i }).click();
    });
  });

  it('removes a key from the list when it is deleted', () => {
    const description = 'E2E delete key - ' + new Date().getTime();

    cy.intercept('POST', '**/api/UserApiKeys').as('createKey');
    cy.visit('/api-keys');

    createKeyButton().click();
    cy.get('.new-key textarea').type(description);
    cy.findByRole('button', { name: /^submit$/i }).click();
    cy.wait('@createKey');

    cy.intercept('DELETE', '**/api/UserApiKeys/*').as('deleteKey');
    describedRow(description).within(() => {
      cy.findByRole('button', { name: /delete api key/i }).click();
    });
    cy.wait('@deleteKey');

    cy.contains('[data-cy-filament-row]', description).should('not.exist');

    // Gone from the server too, not just from the component's local array.
    cy.reload();
    cy.contains('[data-cy-filament-row]', description).should('not.exist');
  });

  it('abandons a key when the create form is cancelled', () => {
    const description = 'E2E cancelled key - ' + new Date().getTime();

    cy.visit('/api-keys');

    createKeyButton().click();
    cy.get('.new-key textarea').type(description);
    cy.findByRole('button', { name: /^cancel$/i }).click();

    cy.get('.new-key').should('not.exist');
    cy.contains('[data-cy-filament-row]', description).should('not.exist');

    // Re-opening starts blank rather than restoring the abandoned description.
    createKeyButton().click();
    cy.get('.new-key textarea').should('have.value', '');
  });
});
