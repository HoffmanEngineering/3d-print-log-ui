/// <reference types="cypress" />

/**
 * Covers the spool-photo panel: staging, the thumbnail strip, the default marker,
 * and the per-material cap, all of which are client-side and worth pinning on
 * their own. The upload itself is covered by the round-trip describe below.
 */
describe('Material photos', () => {
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

  it('offers an add-photo button on a material with no photos', () => {
    cy.contains('h2', /photos/i).should('be.visible');
    cy.contains('button', /add photo/i).should('be.visible');
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

/**
 * The round trip the panel specs above stop short of: saving a staged photo really
 * does POST it, store it, and hand back a URL the browser can render.
 *
 * Requires the local API in E2ETesting mode with blob storage pointed at Azurite
 * (`AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true`, and Azurite started
 * with `--skipApiVersionCheck` so it accepts the SDK's service version).
 */
describe('Material photos — upload round trip', () => {
  const PHOTO = 'cypress/fixtures/spool-photo.png';

  beforeEach(() => {
    cy.login();
  });

  it('uploads a staged photo on save and serves it back', () => {
    const name = 'Spool Photo Upload Test - ' + Date.now();

    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.intercept('POST', '/api/Filaments/*/images').as('uploadImage');

    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });

    cy.get('input.file-input').selectFile(PHOTO, { force: true });
    cy.get('app-image-thumbnail-strip img').should('have.length', 1);

    cy.get('#edit-filament-submit-btn').click();

    cy.wait('@createFilament')
      .its('response.body.id')
      .then((filamentId: string) => {
        cy.wait('@uploadImage').its('response.statusCode').should('eq', 201);

        // Reload from the API rather than trusting the staged preview still on screen.
        cy.visit(`/filament/${filamentId}`);
        cy.get('app-image-thumbnail-strip img')
          .should('have.length', 1)
          .first()
          .should(($img) => {
            // A signed URL, not a data: preview of the bytes we picked.
            expect($img.attr('src')).to.match(/[?&]sig=/);
            // Decoded and non-zero, i.e. the browser really fetched it.
            expect(
              ($img[0] as HTMLImageElement).naturalWidth
            ).to.be.greaterThan(0);
          });
      });
  });

  // The default photo is signed into the LIST payload by a separate code path
  // (FilamentService.HydrateImageUrlsAsync) and rendered by a different component
  // from the detail panel. Asserting the panel alone missed the column being absent
  // from the materials page entirely, so pin the list here too.
  it('shows the default photo as a thumbnail in the materials list', () => {
    const name = 'Spool Photo List Test - ' + Date.now();

    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.intercept('POST', '/api/Filaments/*/images').as('uploadImage');

    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.get('input.file-input').selectFile(PHOTO, { force: true });
    cy.get('#edit-filament-submit-btn').click();

    cy.wait('@createFilament');
    cy.wait('@uploadImage').its('response.statusCode').should('eq', 201);

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/materials');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');

    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-thumbnail img')
      .should('have.length', 1)
      .and(($img) => {
        expect($img.attr('src')).to.match(/[?&]sig=/);
        expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0);
      });
  });
});
