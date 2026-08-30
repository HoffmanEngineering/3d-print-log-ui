// The screenshot capture harness, shared by every capture spec.
//
// There is exactly one of these because every defect this pipeline has ever
// produced was silent: a missed stub renders the page's own error state, a
// clamped viewport tears the screenshot, a readiness check that counts
// containers passes on a page that loaded nothing. Each guard below turns one
// of those into a loud failure, and a second consumer that re-implemented the
// loop would re-open every one of them.
//
// A spec is now a name and a `CaptureSet`; see `capture-home-screenshots.cy.ts`
// and `capture-doc-figures.cy.ts`.

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

export interface FixtureRoute {
  method: 'GET';
  /**
   * Cypress glob (case-sensitive) or a RegExp.
   *
   * Reach for the RegExp when a query value can contain an unencoded `/`.
   * Cypress matches globs with minimatch, which is a PATH matcher: `*` never
   * crosses a slash, and a trailing `**` only spans segments when it stands
   * alone as a segment. Angular's HttpParams leaves `/` unencoded, so
   * `timeZone=America/New_York` splits the query into two path segments and a
   * glob ending `/api/analytics/overview*` silently stops matching — the
   * request falls through to the offline guard and the page renders its error
   * state.
   */
  url: string | RegExp;
  fixture: string; // path under cypress/fixtures
}

/**
 * One assertion that the capture boundary has actually painted, scoped to that
 * boundary's selector. Built by the helpers below rather than written inline,
 * so a growing set of doc figures shares one small vocabulary instead of one
 * bespoke closure per figure.
 */
export type ReadyStep = (scope: string) => void;

export interface CaptureTarget {
  /** Logical name. For doc figures this is the `<doc-figure name>` value. */
  name: string;
  /** Route to visit, e.g. '/prints'. */
  route: string;
  /** The capture boundary, e.g. '[data-cy="capture-print-list"]'. */
  selector: string;
  /** PNG basename; the dark pass appends `_dark`. */
  outputBase: string;
  /**
   * Capture viewport [width, height]. The height is a starting point only —
   * `fitViewportToTarget` grows it to whatever the boundary actually needs.
   */
  viewport: [number, number];
  /** Proof the boundary painted its content, not just its containers. */
  ready: ReadyStep[];
}

export interface CaptureSet {
  /** Identifies the run to the processing step; names the sidecar file. */
  id: string;
  targets: CaptureTarget[];
  fixtures: FixtureRoute[];
  /** defaultPrintImageId -> committed demo image. */
  printImages: Record<string, string>;
  /** CSS appended to BASE_CAPTURE_CSS for this set only. */
  css?: string;
}

// ---------------------------------------------------------------------------
// Ready predicates
// ---------------------------------------------------------------------------

/** Exactly `count` of `selector` inside the boundary. */
export function rendered(selector: string, count: number): ReadyStep {
  return (scope) => cy.get(`${scope} ${selector}`).should('have.length', count);
}

/** At least `count` of `selector` inside the boundary. */
export function atLeast(selector: string, count: number): ReadyStep {
  return (scope) =>
    cy.get(`${scope} ${selector}`).should('have.length.at.least', count);
}

export function exists(selector: string): ReadyStep {
  return (scope) => cy.get(`${scope} ${selector}`).should('exist');
}

/**
 * `selector` is in the DOM AND laid out.
 *
 * The distinction is not academic. A collapsed panel keeps every control it
 * contains — the print list's filter panel collapses to `max-height: 0`, so
 * counting its `mat-select`s passes on a panel the reader cannot see, and the
 * figure documents a closed panel.
 */
export function visible(selector: string): ReadyStep {
  return (scope) => cy.get(`${scope} ${selector}`).should('be.visible');
}

/**
 * `selector` must NOT be inside the boundary.
 *
 * The skeleton case is the reason this exists: a chart frame still in its
 * loading state occupies the same box as the rendered chart, so a too-early
 * screenshot looks entirely plausible.
 */
export function absent(selector: string): ReadyStep {
  return (scope) => cy.get(`${scope} ${selector}`).should('not.exist');
}

/**
 * None of `selector` renders `placeholder` as its whole text.
 *
 * A stat tile renders an em dash when its metric is null, which is exactly what
 * a failed request produces — so counting tiles is not evidence that any data
 * arrived, and insisting none of them is a dash is.
 */
export function noPlaceholders(selector: string, placeholder = '—'): ReadyStep {
  return (scope) =>
    cy.get(`${scope} ${selector}`).each(($el) => {
      expect($el.text().trim()).not.to.equal(placeholder);
    });
}

/**
 * Every `host` has rendered an `<img>`.
 *
 * Thumbnails arrive async (blob -> data URL) and the host element is in the DOM
 * long before its image is, so the host count is not the thing to wait on.
 */
export function imagesRendered(host: string, timeout = 10000): ReadyStep {
  return (scope) => {
    cy.get(`${scope} ${host}`).then(($hosts) => {
      cy.get(`${scope} ${host} img`, { timeout }).should(
        'have.length',
        $hosts.length
      );
    });
  };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/**
 * Applies to every set: kill animation so the shot is deterministic, and drop
 * the third-party ad slot and the app nav bar, which are chrome rather than the
 * thing being documented.
 */
export const BASE_CAPTURE_CSS = `
  *,*::before,*::after{transition:none!important;animation:none!important}
  app-ad{display:none!important}
  app-navbar{display:none!important}
`;

/**
 * The status donut animates its arcs over ~750ms via d3 (JS-driven, unaffected
 * by the CSS above). Wait past that before screenshotting so arcs are drawn.
 */
const SETTLE_MS = 1200;

/** Headroom over the measured element height, so rounding can't reintroduce a seam. */
const FIT_SLACK = 40;

/** Separator for the un-stubbed-call report, one indented call per line. */
const REPORT_SEPARATOR = '\n  ';

const THEMES: Array<{ mode: 'light' | 'dark'; suffix: string }> = [
  { mode: 'light', suffix: '' },
  { mode: 'dark', suffix: '_dark' },
];

/** Where the processing step looks for what this run was supposed to produce. */
export function sidecarPath(setId: string): string {
  return `cypress/captures/${setId}.json`;
}

function stubApi(set: CaptureSet, unhandled: string[]) {
  // IMPORTANT: register the offline guard FIRST. Cypress matches non-middleware
  // intercepts in REVERSE definition order, so the specific stubs registered
  // afterward take precedence; only genuinely un-stubbed calls fall through here.
  cy.intercept('**/api/**', (req) => {
    unhandled.push(`${req.method} ${req.url}`);
    req.reply({ statusCode: 500, body: {} });
  });
  for (const r of set.fixtures) {
    cy.intercept(r.method, r.url, { fixture: r.fixture });
  }
  // Print row images -> committed demo photos, mapped by imageId (== defaultPrintImageId).
  cy.intercept('GET', '**/api/Prints/*/image/*', (req) => {
    const id = req.url.match(/\/image\/(\d+)/)?.[1] ?? '';
    const file = set.printImages[id];
    if (!file) {
      // No default photo. An unmapped id used to fall back to the llamas, which
      // meant changing a fixture's defaultPrintImageId silently published a
      // screenshot of the wrong print — every readiness check still passes,
      // because an image did render. Reported through the same list as a missed
      // stub, so the run fails and says which id.
      unhandled.push(`${req.method} ${req.url} (no demo image for id ${id})`);
      req.reply({ statusCode: 404, body: {} });
      return;
    }
    req.reply({ fixture: file });
  });
}

/**
 * Deterministic client state: theme plus the print-list view/columns/page size,
 * so a developer's saved grouped view, custom columns or page size cannot leak
 * into a committed image.
 */
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

function prepare(css: string) {
  cy.document().then((doc) => {
    const style = doc.createElement('style');
    style.innerHTML = css;
    doc.head.appendChild(style);
  });
  cy.document()
    .its('fonts')
    .then((fonts: FontFaceSet) => fonts.ready);
}

function captureReady(target: CaptureTarget) {
  cy.get(target.selector).should('be.visible');
  for (const step of target.ready) step(target.selector);
  // Decode any images inside the boundary (a target may legitimately have none).
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
  // The decode rejection above is swallowed, because decode() rejects for
  // reasons that are not failures. What is NOT allowed is an image that ended
  // up with nothing to paint: that renders as a broken-image glyph or as empty
  // space, and every readiness check that merely counted <img> elements would
  // still have passed.
  //
  // Not `cy.get(...).each()`: cy.get fails outright on an empty match, and the
  // materials and analytics boundaries legitimately contain no images.
  cy.get('body').then(() => {
    const imgs = Cypress.$(
      `${target.selector} img`
    ).toArray() as HTMLImageElement[];
    for (const img of imgs) {
      expect(
        img.naturalWidth,
        `image failed to load: ${img.getAttribute('src')?.slice(0, 80)}`
      ).to.be.greaterThan(0);
    }
  });
}

/**
 * Grow the viewport until the capture boundary fits inside it, then prove it fit.
 *
 * An element taller than the viewport is not screenshotted in one pass: Cypress
 * scrolls it and stitches the frames together, and content on the seam is torn.
 * It does not fail — it produces a plausible-looking image with a card cut in
 * half, which is how the original print-list capture shipped.
 *
 * Fitting the viewport to the content is the general fix; hand-tuning a
 * per-target height only holds until the fixtures or the layout change. The
 * assertion is what makes it safe, because cy.viewport() is CLAMPED to what the
 * browser window can show and reports no error when it clamps — that clamp is
 * the original bug. If a future target needs more room than WINDOW_SIZE in
 * cypress.config.capture.ts allows, this fails and says so.
 */
function fitViewportToTarget(target: CaptureTarget) {
  cy.get(target.selector).then(($el) => {
    const needed = Math.ceil($el[0].getBoundingClientRect().height) + FIT_SLACK;
    if (needed > target.viewport[1]) {
      cy.viewport(target.viewport[0], needed);
    }
  });
  cy.window().then((win) => {
    // The same clamp bites the width, and there it is not recoverable at all:
    // a narrowed viewport re-lays-out the page, so the shot is of a different
    // breakpoint rather than a torn one. The desktop doc figures ask for 1280
    // CSS px, which is 2560 device px at the 2x factor.
    expect(
      win.innerWidth,
      `${target.name}: cy.viewport(${target.viewport[0]}) was clamped to ` +
        `${win.innerWidth}px, so this is a screenshot of a different ` +
        `breakpoint. Raise WINDOW_SIZE in cypress.config.capture.ts`
    ).to.equal(target.viewport[0]);

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

/**
 * Records the boundary's CSS width beside the PNG it just produced.
 *
 * This is what lets the processing step prove a capture was taken at the 2x
 * device-scale-factor: `pngWidth / cssWidth` is the device pixel ratio, exactly,
 * for any element. The constant it replaces was a floor on the PNG width, which
 * could only ever be tuned to the NARROWEST target — a 1x capture of a
 * full-width desktop figure sailed over it.
 */
function recordResult(setId: string, outputBase: string, selector: string) {
  cy.get(selector).then(($el) => {
    const cssWidth = $el[0].getBoundingClientRect().width;
    const path = sidecarPath(setId);
    cy.readFile(path).then((sidecar) => {
      sidecar.results = [
        ...sidecar.results.filter(
          (r: { outputBase: string }) => r.outputBase !== outputBase
        ),
        { outputBase, cssWidth },
      ];
      cy.writeFile(path, sidecar);
    });
  });
}

/**
 * Declares the whole suite for one capture set.
 *
 * The sidecar is written from the SAME array the tests iterate, and it records
 * what the run was supposed to produce rather than what it managed to produce.
 * That is what lets the processing step insist on a complete set without
 * mirroring the manifest in a second language — the mirrored list it replaces
 * had already drifted once.
 */
export function runCaptureSuite(title: string, set: CaptureSet) {
  describe(title, () => {
    const css = `${BASE_CAPTURE_CSS}${set.css ?? ''}`;

    // Reported in afterEach, which Cypress runs even when the test itself
    // failed, and asserted inside the test. That split is deliberate. A missed
    // stub does not announce itself: the page renders its error state, the
    // ready steps wait for content that will never arrive, and the run reports
    // the timeout with the cause thrown away — so the report has to survive the
    // failure. The assertion stays in the test because a failing afterEach hook
    // makes Mocha skip the rest of the suite, and one broken target should not
    // cost the others their captures.
    let unhandled: string[] = [];

    before(() => {
      cy.writeFile(sidecarPath(set.id), {
        set: set.id,
        expected: set.targets.flatMap((target) =>
          THEMES.map((theme) => ({
            name: target.name,
            theme: theme.mode,
            outputBase: `${target.outputBase}${theme.suffix}`,
          }))
        ),
        results: [],
      });
    });

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

    for (const theme of THEMES) {
      for (const target of set.targets) {
        it(`captures ${target.outputBase}${theme.suffix}`, () => {
          cy.login();
          stubApi(set, unhandled);
          cy.viewport(target.viewport[0], target.viewport[1]);
          // Set client state in onBeforeLoad so the pre-paint theme script in
          // index.html reads the right theme-mode before first paint.
          cy.visit(target.route, {
            onBeforeLoad(win) {
              setClientState(win, theme.mode);
            },
          });
          prepare(css);
          captureReady(target);
          // Grow the viewport first, then re-run the readiness checks: a taller
          // viewport can reveal content that was below the fold, and its images
          // still have to be decoded before the shot.
          fitViewportToTarget(target);
          captureReady(target);
          cy.wait(SETTLE_MS);
          const outputBase = `${target.outputBase}${theme.suffix}`;
          cy.get(target.selector).screenshot(outputBase, { overwrite: true });
          // Fail if any API call escaped the fixtures, BEFORE recording the
          // result. Recording it first would mean a run whose page rendered an
          // error state still handed the processing step a complete-looking
          // sidecar, and the bad image would be published on the strength of it.
          // afterEach prints the offending URLs.
          cy.wrap(null).then(() => {
            expect(unhandled, 'un-stubbed API calls').to.be.empty;
          });
          recordResult(set.id, outputBase, target.selector);
        });
      }
    }
  });
}
