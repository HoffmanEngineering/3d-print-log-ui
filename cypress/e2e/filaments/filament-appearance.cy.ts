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
    cy.contains('[data-cy-filament-row]', name)
      .find('.filament-color-cell')
      .should(($el) => {
        const style = $el.attr('style') ?? '';
        expect(style).to.include('linear-gradient(90deg');
        // Chrome normalizes hex to rgb; hard stops means each color appears twice → 6 rgb() entries for 3 colors
        const rgbMatches = style.match(/rgb\(/g) ?? [];
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
    cy.contains('[data-cy-filament-row]', name)
      .find('.filament-color-cell')
      .should(($el) => {
        const style = $el.attr('style') ?? '';
        expect(style).to.include('linear-gradient(90deg');
        // Chrome normalizes hex to rgb; Classic preset has 6 colors → at least 6 rgb() entries
        const rgbMatches = style.match(/rgb\(/g) ?? [];
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
    cy.contains('[data-cy-filament-row]', name)
      .find('.filament-color-cell')
      .should(($el) => {
        const style = $el.attr('style') ?? '';
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
    cy.contains('[data-cy-filament-row]', name)
      .find('.filament-color-cell')
      .should(($el) => {
        const style = $el.attr('style') ?? '';
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

describe('Effects — swatch rendering', () => {
  beforeEach(() => {
    cy.login();
  });

  // ── CSS-pipe effects: assert on table swatch inline style ──────────────────

  it('GlowInDark: table swatch has green box-shadow', () => {
    const name = 'GlowInDark Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Glow-in-Dark').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.contains('[data-cy-filament-row]', name)
      .find('.filament-color-cell')
      .should(($el) => {
        const style = $el.attr('style') ?? '';
        expect(style).to.include('box-shadow');
        expect(style).to.match(/rgba\(120,\s*255,\s*120/);
      });
  });

  it('Translucent: table swatch has opacity: 0.7', () => {
    const name = 'Translucent Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Translucent').click();
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
      .should('include', 'opacity: 0.7');
  });

  // ── Icon-level effects: assert on SVG elements in the card view (< 600px) ──
  // Cards are CSS-only hidden at >= 600px. cy.viewport(599, 900) exposes them.

  it('Sparkle: card icon SVG contains path.sparkle-dot elements', () => {
    const name = 'Sparkle Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Sparkle').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('path.sparkle-dot')
      .should('have.length.greaterThan', 0);
  });

  it('Wood Fill: card icon SVG defs contain wood linearGradient', () => {
    const name = 'WoodFill Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Wood Fill').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('linearGradient[id*="-wood"]')
      .should('exist');
  });

  it('GlowInDark: card icon SVG defs contain glow filter', () => {
    const name = 'GlowIcon Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Glow-in-Dark').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('filter[id*="-glow"]')
      .should('exist');
  });

  it('Carbon Fiber: card icon SVG defs contain carbon-fiber pattern', () => {
    const name = 'CarbonFiber Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Carbon Fiber').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('pattern[id*="-cf"]')
      .should('exist');
  });

  it('Metal Fill: card icon SVG defs contain metal linearGradient', () => {
    const name = 'MetalFill Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Metal Fill').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('linearGradient[id*="-metal"]')
      .should('exist');
  });

  it('Fluorescent: card icon SVG defs contain UV filter', () => {
    const name = 'Fluorescent Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Fluorescent').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('filter[id*="-uv"]')
      .should('exist');
  });

  it('Glass Fiber: card icon SVG defs contain glass-fiber pattern', () => {
    const name = 'GlassFiber Test - ' + Date.now();
    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(name);
    cy.get('#edit-filament-material-type').type('PLA');
    cy.get('#edit-filament-density')
      .clear({ force: true })
      .type('1.24', { force: true });
    cy.contains('mat-chip-option', 'Glass Fiber').click();
    cy.get('#edit-filament-submit-btn').click();
    cy.wait('@createFilament');

    cy.viewport(599, 900);
    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.visit('/filament');
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(name);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-card]')
      .first()
      .find('pattern[id*="-gf"]')
      .should('exist');
  });
});

describe('Cross-screen swatch rendering', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Print list: gradient filament swatch shows linear-gradient in print row', () => {
    const ts = Date.now();
    const filamentName = 'CrossScreen Gradient - ' + ts;
    const printTitle = 'CrossScreen Print List - ' + ts;

    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(filamentName);
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

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .find('.mat-column-title')
      .first()
      .click();
    cy.get('[data-cy-edit-btn]').click();

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').click();
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(filamentName);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();

    cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
    cy.get('#edit-print-submit-btn').click();
    cy.wait('@updatePrint');

    cy.visit('/prints');
    cy.findByRole('button', { name: /reset filters/i }).click();
    // The print row renders its material swatch through app-filament-color-swatch
    // (class "swatch"), not the .filament-color-cell the filament list uses.
    cy.contains('[cy-print-row]', printTitle)
      .find('app-filament-color-swatch .swatch')
      .invoke('attr', 'style')
      .should('include', 'linear-gradient');
  });

  it('Edit-print-detail: gradient filament swatch shows linear-gradient in usage section', () => {
    const ts = Date.now();
    const filamentName = 'CrossScreen Gradient2 - ' + ts;
    const printTitle = 'CrossScreen EditDetail - ' + ts;

    cy.intercept('POST', '/api/Filaments').as('createFilament');
    cy.visit('/filament/new');
    cy.get('#edit-filament-name').type(filamentName);
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

    cy.createPrint(printTitle);

    cy.contains('[cy-print-row]', printTitle)
      .find('.mat-column-title')
      .first()
      .click();
    cy.get('[data-cy-edit-btn]').click();

    cy.intercept('GET', '/api/Filaments*').as('getFilaments');
    cy.get('#add-new-filament-usage-btn').click();
    cy.get('[data-cy="select-filament-btn"]').click();
    cy.wait('@getFilaments');
    cy.get('#filament-list-search-input').clear().type(filamentName);
    cy.wait('@getFilaments');
    cy.get('[data-cy-filament-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy-filament-row]').first().click();

    cy.get('.filament-color-cell')
      .invoke('attr', 'style')
      .should('include', 'linear-gradient');
  });
});
