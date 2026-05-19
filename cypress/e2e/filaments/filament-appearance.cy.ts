describe('Color Pattern — form behavior', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/filament/new');
  });

  it('Solid: shows exactly 1 color picker, no add/remove buttons', () => {
    cy.contains('mat-button-toggle', 'Solid').click();
    cy.get('input[type="color"]').should('have.length', 1);
    cy.contains('button', 'Add color').should('not.exist');
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Gradient: shows 2 color pickers labeled Start / End, no add or remove buttons', () => {
    cy.contains('mat-button-toggle', 'Gradient').click();
    cy.get('input[type="color"]').should('have.length', 2);
    cy.contains('mat-label', 'Start').should('exist');
    cy.contains('mat-label', 'End').should('exist');
    cy.contains('button', 'Add color').should('not.exist');
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Multi: starts with 2 pickers and an add button, no remove at minimum', () => {
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.get('input[type="color"]').should('have.length', 2);
    cy.contains('button', 'Add color').should('be.visible');
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Multi: clicking add grows picker count to 3', () => {
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.contains('button', 'Add color').click();
    cy.get('input[type="color"]').should('have.length', 3);
    cy.get('button[aria-label="Remove color"]').should('be.visible');
  });

  it('Multi: clicking remove shrinks picker count back to 2 and hides remove', () => {
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.contains('button', 'Add color').click();
    cy.get('button[aria-label="Remove color"]').first().click();
    cy.get('input[type="color"]').should('have.length', 2);
    cy.get('button[aria-label="Remove color"]').should('not.exist');
  });

  it('Rainbow: shows 5 preset buttons', () => {
    cy.contains('mat-button-toggle', 'Rainbow').click();
    ['Classic', 'Ocean', 'Sunset', 'Galaxy', 'Forest'].forEach((label) => {
      cy.contains('button', label).should('be.visible');
    });
  });

  it('Rainbow: applying Classic preset populates 6 color pickers', () => {
    cy.contains('mat-button-toggle', 'Rainbow').click();
    cy.contains('button', 'Classic').click();
    cy.get('input[type="color"]').should('have.length', 6);
  });

  it('Gradient and Rainbow show the gradient preview strip; Solid does not', () => {
    cy.contains('mat-button-toggle', 'Gradient').click();
    cy.get('[data-cy="gradient-preview"]').should('be.visible');

    cy.contains('mat-button-toggle', 'Rainbow').click();
    cy.get('[data-cy="gradient-preview"]').should('be.visible');

    cy.contains('mat-button-toggle', 'Solid').click();
    cy.get('[data-cy="gradient-preview"]').should('not.exist');
  });
});

describe('Color Pattern — swatch rendering', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Solid: swatch background matches the single hex color', () => {
    const name = 'Solid Pattern Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.get('input[type="color"]')
      .eq(0)
      .invoke('val', '#e63946')
      .trigger('input')
      .trigger('change');
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .should('match', /background:\s*rgb\(230,\s*57,\s*70\)/);
  });

  it('Gradient: swatch contains linear-gradient(90deg', () => {
    const name = 'Gradient Pattern Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-button-toggle', 'Gradient').click();
    cy.get('input[type="color"]')
      .eq(0)
      .invoke('val', '#0077b6')
      .trigger('input')
      .trigger('change');
    cy.get('input[type="color"]')
      .eq(1)
      .invoke('val', '#90e0ef')
      .trigger('input')
      .trigger('change');
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .should('include', 'linear-gradient(90deg');
  });

  it('Multi: swatch has linear-gradient with each color appearing twice (hard stops)', () => {
    const name = 'Multi Pattern Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-button-toggle', 'Multi-Color').click();
    cy.contains('button', 'Add color').click();
    cy.get('input[type="color"]')
      .eq(0)
      .invoke('val', '#ff4d4d')
      .trigger('input')
      .trigger('change');
    cy.get('input[type="color"]')
      .eq(1)
      .invoke('val', '#ffe040')
      .trigger('input')
      .trigger('change');
    cy.get('input[type="color"]')
      .eq(2)
      .invoke('val', '#4d96ff')
      .trigger('input')
      .trigger('change');
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .then((style) => {
        expect(style).to.include('linear-gradient(90deg');
        // Chrome normalizes hex to rgb; hard stops means each color appears twice → 6 rgb() entries for 3 colors
        const rgbMatches = style!.match(/rgb\(/g) ?? [];
        expect(rgbMatches.length).to.be.at.least(6);
      });
  });

  it('Rainbow: swatch contains linear-gradient(90deg with multiple colors', () => {
    const name = 'Rainbow Pattern Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-button-toggle', 'Rainbow').click();
    cy.contains('button', 'Classic').click();
    // Wait for Angular to apply preset (6 pickers must exist before submitting)
    cy.get('input[type="color"]').should('have.length', 6);
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .then((style) => {
        expect(style).to.include('linear-gradient(90deg');
        // Chrome normalizes hex to rgb; Classic preset has 6 colors → at least 6 rgb() entries
        const rgbMatches = style!.match(/rgb\(/g) ?? [];
        expect(rgbMatches.length).to.be.at.least(6);
      });
  });
});

describe('Finish Type — swatch rendering', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Standard: swatch has background color, no filter or shimmer background-image', () => {
    const name = 'Standard Finish Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .then((style) => {
        expect(style).to.include('background');
        expect(style).not.to.include('filter');
        expect(style).not.to.include('linear-gradient(110deg');
      });
  });

  it('Silk: swatch has shimmer background-image and background-size: 200%', () => {
    const name = 'Silk Finish Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-button-toggle', 'Silk / Glossy').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .then((style) => {
        expect(style).to.include('background-image');
        expect(style).to.include('linear-gradient(110deg');
        expect(style).to.include('background-size: 200%');
      });
  });

  it('Matte: swatch has filter with saturate and brightness', () => {
    const name = 'Matte Finish Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-button-toggle', 'Matte / Satin').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]')
      .first()
      .find('.filament-color-cell')
      .invoke('attr', 'style')
      .should('include', 'filter: saturate(0.6) brightness(0.95)');
  });
});
