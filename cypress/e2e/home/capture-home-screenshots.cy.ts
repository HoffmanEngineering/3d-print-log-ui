import {
  FIXTURE_ROUTES,
  CAPTURE_TARGETS,
  PRINT_IMAGE_MAP,
} from '../../fixtures/demo/manifest';

// Disable animations/transitions, hide ad slots, and hide the app nav bar so
// captures are deterministic and free of third-party ad / nav chrome.
const CAPTURE_CSS = `
  *,*::before,*::after{transition:none!important;animation:none!important}
  app-ad{display:none!important}
  app-navbar{display:none!important}
  #filter-panel{display:none!important}
`;

// The status donut animates its arcs over ~750ms via d3 (JS-driven, unaffected
// by the CSS above). Wait past that before screenshotting so arcs are fully drawn.
const SETTLE_MS = 1200;

// Per-target "the content actually rendered" assertion, matched to the real DOM.
const READY: Record<string, () => void> = {
  PrinterList: () => {
    cy.get('[data-cy="home-capture-prints"] [cy-print-row]').should(
      'have.length',
      5
    );
    // Print thumbnails load async (blob -> data URL). There are two responsive
    // image columns, so wait for every app-print-image to have rendered its img.
    cy.get('[data-cy="home-capture-prints"] app-print-image').then(($comps) => {
      const n = $comps.length;
      cy.get('[data-cy="home-capture-prints"] app-print-image img', {
        timeout: 10000,
      }).should('have.length', n);
    });
  },
  Filament: () =>
    cy
      .get('[data-cy="home-capture-materials"] [data-cy-filament-row]')
      .should('have.length.greaterThan', 0),
  Analytics: () => {
    cy.get('[data-cy="home-capture-analytics"] .card').should(
      'have.length.greaterThan',
      0
    );
    cy.get('[data-cy="home-capture-analytics"] svg').should('exist');
  },
};

function stubApi(unhandled: string[]) {
  // IMPORTANT: register the offline guard FIRST. Cypress matches non-middleware
  // intercepts in REVERSE definition order, so the specific stubs registered
  // afterward take precedence; only genuinely un-stubbed calls fall through here.
  cy.intercept('**/api/**', (req) => {
    unhandled.push(`${req.method} ${req.url}`);
    req.reply({ statusCode: 500, body: {} });
  });
  for (const r of FIXTURE_ROUTES) {
    cy.intercept(r.method, r.url, { fixture: r.fixture });
  }
  // Print row images -> committed demo photos, mapped by imageId (== defaultPrintImageId).
  cy.intercept('GET', '**/api/Prints/*/image/*', (req) => {
    const id = req.url.match(/\/image\/(\d+)/)?.[1] ?? '';
    const file = PRINT_IMAGE_MAP[id] ?? 'demo/images/llamas.jpg';
    req.reply({ fixture: file });
  });
}

// Deterministic client state: theme + print-list view/columns/page-size, so a
// developer's saved grouped view / custom columns / page size can't change the shot.
function setClientState(win: Window, mode: 'light' | 'dark') {
  win.localStorage.setItem('theme-mode', mode);
  win.localStorage.setItem('print_list_view_mode', 'list');
  win.localStorage.removeItem('print_table_displayed_columns');
  win.localStorage.setItem('print_list_page_size', '25');
  // Neutralize AdSense: make push a no-op so the ad slot (hidden in capture)
  // can't throw "No slot size for availableWidth=0" and fail the run.
  const w = win as unknown as { adsbygoogle: { push: () => void } };
  w.adsbygoogle = { push: () => undefined };
}

function prepare() {
  cy.document().then((doc) => {
    const style = doc.createElement('style');
    style.innerHTML = CAPTURE_CSS;
    doc.head.appendChild(style);
  });
  cy.document()
    .its('fonts')
    .then((fonts: FontFaceSet) => fonts.ready);
  // The auto-opened filter panel (opens >=600px on /prints and /materials) is
  // hidden via CAPTURE_CSS so the capture frames the list, not the filter chrome.
}

function captureReady(target: (typeof CAPTURE_TARGETS)[number]) {
  cy.get(target.selector).should('be.visible');
  READY[target.name]();
  // Decode any images that exist inside the boundary (materials/analytics may have none).
  cy.get('body').then(() => {
    const imgs = Cypress.$(
      `${target.selector} img`
    ).toArray() as HTMLImageElement[];
    return Cypress.Promise.all(
      imgs.map((el) =>
        el.decode ? el.decode().catch(() => undefined) : Promise.resolve()
      )
    );
  });
}

describe('Capture home screenshots', () => {
  const themes: Array<{ mode: 'light' | 'dark'; suffix: string }> = [
    { mode: 'light', suffix: '' },
    { mode: 'dark', suffix: '_dark' },
  ];

  for (const theme of themes) {
    for (const target of CAPTURE_TARGETS) {
      it(`captures ${target.outputBase}${theme.suffix}`, () => {
        const unhandled: string[] = [];
        cy.login();
        stubApi(unhandled);
        cy.viewport(target.viewport[0], target.viewport[1]);
        // Set client state in onBeforeLoad so the pre-paint theme script in
        // index.html reads the right theme-mode before first paint.
        cy.visit(target.route, {
          onBeforeLoad(win) {
            setClientState(win, theme.mode);
          },
        });
        prepare();
        captureReady(target);
        cy.wait(SETTLE_MS);
        cy.get(target.selector).screenshot(
          `${target.outputBase}${theme.suffix}`,
          {
            overwrite: true,
          }
        );
        // Fail if any API call escaped the fixtures.
        cy.wrap(null).then(() => {
          expect(unhandled, `un-stubbed API calls:\n${unhandled.join('\n')}`).to
            .be.empty;
        });
      });
    }
  }
});
