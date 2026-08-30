import {
  FIXTURE_ROUTES,
  CAPTURE_TARGETS,
  PRINT_IMAGE_MAP,
} from '../../fixtures/demo/manifest';

// Disable animations/transitions, hide ad slots, and hide the app nav bar so
// captures are deterministic and free of third-party ad / nav chrome. The
// analytics tab's lone "Export this tab (CSV)" button goes too: it would sit
// alone above the tiles in a narrow crop and frame the chrome, not the data.
const CAPTURE_CSS = `
  *,*::before,*::after{transition:none!important;animation:none!important}
  app-ad{display:none!important}
  app-navbar{display:none!important}
  #filter-panel{display:none!important}
  .overview-tab__actions{display:none!important}
`;

// The status donut animates its arcs over ~750ms via d3 (JS-driven, unaffected
// by the CSS above). Wait past that before screenshotting so arcs are fully drawn.
const SETTLE_MS = 1200;

/** Headroom over the measured element height, so rounding can't reintroduce a seam. */
const FIT_SLACK = 40;

/** Separator for the un-stubbed-call report, one indented call per line. */
const REPORT_SEPARATOR = '\n  ';

// Per-target "the content actually rendered" assertion, matched to the real DOM.
const READY: Record<string, () => void> = {
  PrinterList: () => {
    // Cards, not table rows. The capture viewport is inside the print list's
    // handset breakpoint (max-width: 959.98px), where the mat-table carrying
    // [cy-print-row] is never rendered at all.
    cy.get('[data-cy="home-capture-prints"] app-print-card').should(
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
    // Six tiles swap their skeleton for a value, and both chart frames swap
    // theirs for rendered content. Asserting the skeletons are gone matters as
    // much as asserting the values arrived: a frame still in its loading state
    // renders at the same size, so a too-early shot looks plausible.
    cy.get('[data-cy="home-capture-analytics"] [data-testid="stat-value"]')
      .should('have.length', 6)
      // A tile renders an em dash when its metric is null, which is exactly what
      // a failed request produces. Counting the tiles is not evidence that any
      // data arrived; insisting none of them is a dash is.
      .each(($tile) => {
        expect($tile.text().trim()).not.to.equal('—');
      });
    cy.get(
      '[data-cy="home-capture-analytics"] [data-testid="chart-skeleton"]'
    ).should('not.exist');
    cy.get(
      '[data-cy="home-capture-analytics"] [data-testid="chart-content"]'
    ).should('have.length', 2);
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

/**
 * Grow the viewport until the capture boundary fits inside it, then prove it
 * fit.
 *
 * An element taller than the viewport is not screenshotted in one pass:
 * Cypress scrolls it and stitches the frames together, and content on the seam
 * is torn. It does not fail — it produces a plausible-looking image with a card
 * cut in half, which is how the pre-existing print-list capture shipped.
 *
 * Fitting the viewport to the content is the general fix; hand-tuning a per-
 * target height only holds until the fixtures or the layout change. The
 * assertion is what makes it safe, because cy.viewport() is CLAMPED to what the
 * browser window can show and reports no error when it clamps — that clamp is
 * the original bug. If a future target needs more room than WINDOW_SIZE in
 * cypress.config.capture.ts allows, this fails and says so.
 */
function fitViewportToTarget(
  target: (typeof CAPTURE_TARGETS)[number],
  width: number
) {
  cy.get(target.selector).then(($el) => {
    const needed = Math.ceil($el[0].getBoundingClientRect().height) + FIT_SLACK;
    if (needed > target.viewport[1]) {
      cy.viewport(width, needed);
    }
  });
  cy.window().then((win) => {
    cy.get(target.selector).then(($el) => {
      const height = $el[0].getBoundingClientRect().height;
      expect(
        win.innerHeight,
        `${target.name}: viewport must fit the capture boundary, or Cypress ` +
          `stitches the screenshot and tears it. Raise WINDOW_SIZE in ` +
          `cypress.config.capture.ts`
      ).to.be.at.least(height);
    });
  });
}

describe('Capture home screenshots', () => {
  const themes: Array<{ mode: 'light' | 'dark'; suffix: string }> = [
    { mode: 'light', suffix: '' },
    { mode: 'dark', suffix: '_dark' },
  ];

  // Reported in afterEach, which Cypress runs even when the test itself failed,
  // and asserted inside the test. That split is deliberate. A missed stub does
  // not announce itself: the page renders its error state, the ready predicate
  // waits for content that will never arrive, and the run reports the timeout
  // with the cause thrown away — so the report has to survive the failure. The
  // assertion stays in the test because a failing afterEach hook makes Mocha
  // skip the rest of the suite, and one broken target should not cost the other
  // five their captures.
  let unhandled: string[] = [];

  beforeEach(() => {
    unhandled = [];
  });

  afterEach(() => {
    if (unhandled.length > 0) {
      cy.task(
        'log',
        ['un-stubbed API calls:', ...unhandled].join(REPORT_SEPARATOR)
      );
    }
  });

  for (const theme of themes) {
    for (const target of CAPTURE_TARGETS) {
      it(`captures ${target.outputBase}${theme.suffix}`, () => {
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
        // Grow the viewport first, then re-run the readiness checks: a taller
        // viewport can reveal content that was below the fold, and its images
        // still have to be decoded before the shot.
        fitViewportToTarget(target, target.viewport[0]);
        captureReady(target);
        cy.wait(SETTLE_MS);
        cy.get(target.selector).screenshot(
          `${target.outputBase}${theme.suffix}`,
          {
            overwrite: true,
          }
        );
        // Fail if any API call escaped the fixtures. afterEach prints the list.
        cy.wrap(null).then(() => {
          expect(unhandled, 'un-stubbed API calls').to.be.empty;
        });
      });
    }
  }
});
