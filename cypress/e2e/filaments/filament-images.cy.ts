/// <reference types="cypress" />

/**
 * Covers the spool-photo panel up to the point of upload.
 *
 * The POST is deliberately not exercised: storing a photo needs blob storage,
 * which the local and CI API do not provide, so a spec that saved would assert
 * against a 500 rather than against this branch. Everything before the request
 * — staging, the thumbnail strip, the default marker, and the per-material cap
 * — is client-side and worth pinning.
 */
describe('Material spool photos', () => {
  const PHOTO = 'cypress/fixtures/spool-photo.png';

  /** The file input is visually hidden behind the Add button. */
  const stage = (count = 1) =>
    cy
      .get('input.file-input')
      .selectFile(Array(count).fill(PHOTO), { force: true });

  beforeEach(() => {
    cy.login();
    cy.visit('/filament');
    cy.get('#add-new-filament').click();
  });

  it('offers a spool photo button on a material with no photos', () => {
    cy.contains('h2', /photos/i).should('be.visible');
    cy.contains('button', /add spool photo/i).should('be.visible');
  });

  it('stages a picked photo without contacting the API', () => {
    cy.intercept('POST', '/api/Filaments/*/images').as('uploadImage');

    stage();

    cy.get('app-image-thumbnail-strip img').should('have.length', 1);
    // Nothing is sent until the material itself is saved.
    cy.get('@uploadImage.all').should('have.length', 0);
  });

  it('marks the first staged photo as the default', () => {
    stage(2);

    cy.get('app-image-thumbnail-strip img').should('have.length', 2);
    cy.get('app-image-thumbnail-strip li')
      .first()
      .should('have.class', 'is-default');
  });

  it('warns the user rather than staging past the per-material cap', () => {
    // The panel caps at the highest tier the API allows.
    stage(11);

    cy.get('app-image-thumbnail-strip img').should('have.length', 10);
    cy.contains(/were not added/i).should('be.visible');
    cy.contains(/maximum 10 images reached/i).should('be.visible');
  });

  it('drops a staged photo again when it is deleted', () => {
    stage(2);
    cy.get('app-image-thumbnail-strip img').should('have.length', 2);

    cy.get('[aria-label="Delete image 1"]').click({ force: true });

    cy.get('app-image-thumbnail-strip img').should('have.length', 1);
  });
});
