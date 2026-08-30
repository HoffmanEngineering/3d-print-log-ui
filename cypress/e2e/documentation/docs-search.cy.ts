// End-to-end coverage for the /docs search palette.
//
// These deliberately cover the things the unit tests CANNOT reach:
//
//   - Real focus. The dialog spec can only assert the `autoFocus` value passed
//     to MatDialog; whether the caret actually lands in the input depends on
//     CDK's focus trap running in a real browser. That distinction is the whole
//     bug `autoFocus: false` caused, so it is worth a browser to prove.
//   - Real scrolling. MatDialog pins `html` while it is open and RESTORES the
//     scroll position when it closes, which is why navigation is deferred until
//     afterClosed(). Nothing in jsdom or a component fixture models that.
//   - The real index through the real engine. A unit test mocks
//     DocsSearchService, so nothing there proves the generated JSON, MiniSearch
//     and the emit pipeline agree with one another.
//
// /docs is public, so none of this calls cy.login() and none of it needs the
// API — the pages are prerendered and the index is a static import.

// Ctrl+K, with the modifier RELEASED. `release: false` would leave Ctrl held
// for the rest of the test, turning the next `.type('material')` into a string
// of chords that never reach the input.
const openWithShortcut = () => cy.get('body').type('{ctrl}k');

describe('Documentation search', () => {
  beforeEach(() => {
    cy.visit('/docs/getting-started?devUserId=anonymous');

    // /docs is a lazy chunk, and the keyboard shortcut is a host listener on a
    // component inside it. Typing before it has rendered sends the chord into a
    // page that is not listening yet, which fails as "the palette never opened"
    // and sends you looking in the wrong place entirely.
    cy.get('[data-cy=docs-search-button]', { timeout: 20000 }).should(
      'be.visible'
    );
  });

  it('puts the caret in the search box when opened with the keyboard', () => {
    // The regression that motivated this file: `autoFocus: false` left focus on
    // the dialog panel, so Ctrl+K opened a palette you could not type into.
    openWithShortcut();

    cy.get('[data-cy=docs-search-input]')
      .should('be.visible')
      .and('have.focus');
  });

  it('puts the caret in the search box when opened with the toolbar button', () => {
    cy.get('[data-cy=docs-search-button]').click();

    cy.get('[data-cy=docs-search-input]')
      .should('be.visible')
      .and('have.focus');
  });

  it('finds a section and deep-links to its heading', () => {
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('material');

    cy.get('[data-cy=docs-search-result]').should('have.length.greaterThan', 0);
    cy.get('[data-cy=docs-search-result]').first().click();

    // The fragment survives the close, and the anchor it names is actually on
    // the page it landed on.
    cy.location('hash').should('not.be.empty');
    cy.location('hash').then((hash) => {
      cy.get(hash).should('exist');
    });
  });

  it('scrolls to the section rather than the top of the page', () => {
    // MatDialog restores the scroll position as it closes, so a navigation
    // issued before then is scrolled correctly and then silently undone. This
    // is the assertion that would have caught that.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('material');

    // A result that names an anchor; a page-level hit has nothing to scroll to.
    cy.get('[data-cy=docs-search-result]').first().click();
    cy.location('hash').should('not.be.empty');

    cy.window().its('scrollY').should('be.greaterThan', 0);
  });

  it('searches the code samples on the integration pages', () => {
    // Proves the generated index, MiniSearch and the emit pipeline agree: this
    // flag lives inside a <pre> whose content is an interpolated constant, so
    // it only matches if both the code indexing and the binding resolution
    // survived the whole build.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('callback-port');

    cy.get('[data-cy=docs-search-result]')
      .should('have.length.greaterThan', 0)
      .first()
      .should('contain.text', 'Connect an AI Assistant');
  });

  it('opens the highlighted result with the arrow keys and Enter', () => {
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('material');
    cy.get('[data-cy=docs-search-result]').should('have.length.greaterThan', 1);

    // Focus never leaves the input: selection is conveyed by
    // aria-activedescendant, which is what the arrow keys drive.
    cy.get('[data-cy=docs-search-input]')
      .type('{downarrow}')
      .should('have.attr', 'aria-activedescendant', 'docs-search-result-1');

    cy.get('[data-cy=docs-search-input]').type('{enter}');

    cy.location('pathname').should('include', '/docs/');
    cy.get('[data-cy=docs-search-input]').should('not.exist');
  });

  it('offers feedback when nothing matched', () => {
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('zzzznotathinginthedocs');

    cy.get('[data-cy=docs-search-empty]').should('be.visible');
    cy.get('[data-cy=docs-search-result]').should('not.exist');
  });

  it('closes on Escape without navigating', () => {
    cy.location('pathname').then((before) => {
      openWithShortcut();
      cy.get('[data-cy=docs-search-input]').should('be.visible').type('{esc}');

      cy.get('[data-cy=docs-search-input]').should('not.exist');
      cy.location('pathname').should('eq', before);
    });
  });

  it('does not stack a second palette when opened twice', () => {
    // Three entry points share one dialog ref precisely so this cannot happen.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').should('be.visible');

    openWithShortcut();

    cy.get('[data-cy=docs-search-input]').should('have.length', 1);
  });
});
