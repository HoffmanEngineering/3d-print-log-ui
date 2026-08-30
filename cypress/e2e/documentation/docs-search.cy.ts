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

  it('finds a section and deep-links to the heading that result named', () => {
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('material');
    cy.get('[data-cy=docs-search-result]').should('have.length.greaterThan', 0);

    // The result's own title is read out of the DOM rather than hard-coded, so
    // this stays honest as the docs change: it proves the destination matches
    // WHICHEVER result was clicked, instead of pinning a ranking that a future
    // edit can reshuffle.
    cy.get('[data-cy=docs-search-result]')
      .first()
      .find('.docs-search__result-title')
      .invoke('text')
      .then((title) => {
        const heading = title.trim();
        cy.get('[data-cy=docs-search-result]').first().click();

        cy.location('hash').should('not.be.empty');
        cy.location('hash').then((hash) => {
          // The anchor exists, is on screen, and is the heading the result
          // advertised — not merely some element carrying that id.
          cy.get(hash).should('be.visible').and('contain.text', heading);
        });
      });
  });

  it('scrolls the section into view rather than landing at the top', () => {
    // MatDialog restores the scroll position as it closes, so a navigation
    // issued before then is scrolled correctly and then silently undone.
    //
    // Asserted on the TARGET's position, not on a scroll offset: the docs
    // scroll `mat-sidenav-content` on desktop and the document on mobile
    // (documentation.component.ts), so `window.scrollY` answers the wrong
    // question on one of the two layouts. Where the heading ended up on screen
    // is the thing that actually matters, and it is layout-independent.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('material');
    cy.get('[data-cy=docs-search-result]').first().click();

    cy.location('hash').should('not.be.empty');
    cy.location('hash').then((hash) => {
      cy.get(hash).then(($el) => {
        const top = $el[0].getBoundingClientRect().top;
        expect(top, 'heading is inside the viewport').to.be.within(
          0,
          Cypress.config('viewportHeight')
        );
      });
    });
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

    // Captured BEFORE Enter. Asserting `pathname` contains '/docs/' afterwards
    // was already true of the starting page, so removing the navigation
    // entirely still passed — the test proved only that Enter closed the
    // dialog. Verified by mutation: dropping navigateByUrl now fails here.
    cy.get('#docs-search-result-1 .docs-search__result-title')
      .invoke('text')
      .then((title) => {
        const chosen = title.trim();

        cy.location('href').then((before) => {
          cy.get('[data-cy=docs-search-input]').type('{enter}');

          cy.get('[data-cy=docs-search-input]').should('not.exist');
          cy.location('href').should('not.eq', before);
          cy.contains(chosen).should('be.visible');
        });
      });
  });

  it('offers feedback when nothing matched', () => {
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('zzzznotathinginthedocs');

    cy.get('[data-cy=docs-search-empty]').should('be.visible');
    cy.get('[data-cy=docs-search-result]').should('not.exist');
  });

  it('closes on Escape without navigating', () => {
    // The whole href, not just the pathname: closing must not leave a fragment
    // or a query behind either, and a pathname comparison would not notice.
    cy.location('href').then((before) => {
      openWithShortcut();
      cy.get('[data-cy=docs-search-input]').should('be.visible').type('{esc}');

      cy.get('[data-cy=docs-search-input]').should('not.exist');
      cy.location('href').should('eq', before);
    });
  });

  it('opens from the sidebar box as well as the toolbar', () => {
    // The third entry point. It had a test hook and no test, which is the
    // shape of a gap that stays invisible until the entry point breaks.
    cy.get('[data-cy=docs-sidebar-search]').click();

    cy.get('[data-cy=docs-search-input]')
      .should('be.visible')
      .and('have.focus');
  });

  it('can be closed and opened again', () => {
    // DocsSearchOpener holds ONE ref and clears it from afterClosed(). If that
    // teardown regressed, the second open would find a stale ref and do
    // nothing at all — and every other test here opens the palette exactly
    // once, so none of them would notice.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').should('be.visible').type('{esc}');
    cy.get('[data-cy=docs-search-input]').should('not.exist');

    openWithShortcut();

    cy.get('[data-cy=docs-search-input]')
      .should('be.visible')
      .and('have.focus');
  });

  it('has no accessibility violations while open', () => {
    // The palette drives selection through aria-activedescendant against a
    // listbox whose options are deliberately not focusable, which is the kind
    // of hand-rolled ARIA that is easy to get subtly wrong.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').type('material');
    cy.get('[data-cy=docs-search-result]').should('have.length.greaterThan', 0);

    cy.checkA11yWithReport('.docs-search');
  });

  it('does not stack a second palette when opened twice', () => {
    // Three entry points share one dialog ref precisely so this cannot happen.
    openWithShortcut();
    cy.get('[data-cy=docs-search-input]').should('be.visible');

    openWithShortcut();

    cy.get('[data-cy=docs-search-input]').should('have.length', 1);
  });
});
