// Single source of truth for the capture pipeline.
//
// - `FIXTURE_ROUTES`: endpoint glob -> fixture file (relative to cypress/fixtures).
//   The harness registers a catch-all offline guard first, then these, so these
//   specific stubs win (Cypress matches non-middleware intercepts in reverse
//   definition order).
// - `HOME_CAPTURE_SET` / `DOC_CAPTURE_SET`: the two consumers. Everything about
//   how a capture is taken lives in `cypress/support/capture.ts`; this file only
//   says WHAT to capture.
//
// Adding a doc figure is three lines here plus a `<doc-figure name="...">` in
// the Markdown. Nothing else — no template edit, no hand-written asset path.

import {
  absent,
  atLeast,
  CaptureSet,
  CaptureTarget,
  exists,
  FixtureRoute,
  imagesRendered,
  noPlaceholders,
  rendered,
  visible,
} from '../../support/capture';

export type { CaptureSet, CaptureTarget, FixtureRoute };

export const FIXTURE_ROUTES: FixtureRoute[] = [
  {
    method: 'GET',
    url: '**/api/Prints/summary*',
    fixture: 'demo/prints-summary.json',
  },
  {
    method: 'GET',
    url: '**/api/printers/summary*',
    fixture: 'demo/printers-summary.json',
  },
  { method: 'GET', url: '**/api/Filaments?*', fixture: 'demo/filaments.json' },
  {
    method: 'GET',
    url: '**/api/Filaments/storage-locations*',
    fixture: 'demo/filament-storage-locations.json',
  },
  {
    method: 'GET',
    url: '**/api/MaterialCategories*',
    fixture: 'demo/materials-categories.json',
  },
  {
    method: 'GET',
    url: '**/api/Users/me/user-settings*',
    fixture: 'demo/user-settings.json',
  },
  {
    method: 'GET',
    // RegExp, not a glob: the query carries an unencoded timeZone path.
    url: /\/api\/analytics\/overview(\?|$)/,
    fixture: 'demo/analytics-overview.json',
  },
  {
    method: 'GET',
    url: '**/api/notifications/unread-count*',
    fixture: 'demo/notifications-unread-count.json',
  },
];

// defaultPrintImageId -> committed demo image, for the /api/Prints/*/image/* intercept.
export const PRINT_IMAGE_MAP: Record<string, string> = {
  '1001': 'demo/images/llamas.jpg',
  '1002': 'demo/images/gourd.jpg',
  '1003': 'demo/images/trophy.jpg',
  '1004': 'demo/images/oculus.jpg',
  '1005': 'demo/images/cat-headbands.jpg',
};

/** The five demo prints in prints-summary.json. */
const DEMO_PRINT_COUNT = 5;

/**
 * One material per print, plus a second on the multi-material wall mount.
 *
 * Material usage is the point of the print-list images — the home copy beside
 * them is about tracking filament, and the doc section is about material usage.
 * Both views render it only when a print carries `filamentUsage`, so a fixture
 * that lost it would still produce a perfectly plausible screenshot of the
 * feature not being there.
 *
 * The two views spell it differently: the card renders `.material-chip`, the
 * table column renders an `app-filament-color-swatch` per usage row.
 */
const DEMO_MATERIAL_COUNT = 6;

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

const HOME_CAPTURE_TARGETS: CaptureTarget[] = [
  {
    name: 'PrinterList',
    route: '/prints',
    selector: '[data-cy="capture-print-list"]',
    outputBase: 'Homepage_PrinterList',
    // Every home target is captured narrow: the list pages switch to their
    // stacked card view below ~600px and the analytics overview tab stacks its
    // tiles and charts, giving the portrait crop the home feature slots are
    // laid out for.
    viewport: [560, 1100],
    ready: [
      // Cards, not table rows. This viewport is inside the print list's handset
      // breakpoint (max-width: 959.98px), where the mat-table carrying
      // [cy-print-row] is never rendered at all.
      rendered('app-print-card', DEMO_PRINT_COUNT),
      imagesRendered('app-print-image'),
      rendered('.material-chip', DEMO_MATERIAL_COUNT),
    ],
  },
  {
    name: 'Filament',
    route: '/materials',
    selector: '[data-cy="capture-material-list"]',
    outputBase: 'Homepage_Filament',
    viewport: [560, 1100],
    ready: [atLeast('[data-cy-filament-row]', 1)],
  },
  {
    name: 'Analytics',
    route: '/analytics',
    selector: '[data-cy="capture-analytics-overview"]',
    outputBase: 'Homepage_Analytics',
    viewport: [720, 1500],
    ready: [
      // Six tiles swap their skeleton for a value, and both chart frames swap
      // theirs for rendered content. Asserting the skeletons are gone matters
      // as much as asserting the values arrived: a frame still in its loading
      // state renders at the same size, so a too-early shot looks plausible.
      rendered('[data-testid="stat-value"]', 6),
      noPlaceholders('[data-testid="stat-value"]'),
      absent('[data-testid="chart-skeleton"]'),
      rendered('[data-testid="chart-content"]', 2),
      exists('svg'),
    ],
  },
];

export const HOME_CAPTURE_SET: CaptureSet = {
  id: 'home',
  targets: HOME_CAPTURE_TARGETS,
  fixtures: FIXTURE_ROUTES,
  printImages: PRINT_IMAGE_MAP,
  // The filter panel auto-opens at >=600px; the home crops want the list, not
  // the filter chrome. The analytics tab's lone "Export this tab (CSV)" button
  // goes for the same reason: alone above the tiles in a narrow crop it frames
  // the chrome, not the data.
  css: `
  #filter-panel{display:none!important}
  .overview-tab__actions{display:none!important}
`,
};

// ---------------------------------------------------------------------------
// Documentation figures
// ---------------------------------------------------------------------------

/**
 * `name` is the `<doc-figure name="...">` value and the published asset's
 * basename, so it is part of the docs contract: renaming one means recapturing
 * and updating the Markdown. `outputBase` only names the intermediate PNG, and
 * is prefixed so a doc capture can never collide with a home capture in
 * cypress/screenshots.
 */
const docTarget = (
  target: Omit<CaptureTarget, 'outputBase'>
): CaptureTarget => ({ ...target, outputBase: `Doc_${target.name}` });

/** Wide enough for the desktop table view, which is what the prose describes. */
const DOC_DESKTOP: [number, number] = [1280, 1200];

/** Inside the handset breakpoint (max-width: 959.98px), where cards render. */
const DOC_HANDSET: [number, number] = [560, 1100];

const DOC_CAPTURE_TARGETS: CaptureTarget[] = [
  docTarget({
    name: 'print-list',
    route: '/prints',
    selector: '[data-cy="capture-print-list"]',
    viewport: DOC_DESKTOP,
    ready: [
      rendered('[cy-print-row]', DEMO_PRINT_COUNT),
      imagesRendered('app-print-image'),
      rendered('app-filament-color-swatch', DEMO_MATERIAL_COUNT),
    ],
  }),
  docTarget({
    name: 'print-list-filters',
    route: '/prints',
    selector: '[data-cy="capture-print-filters"]',
    viewport: DOC_DESKTOP,
    ready: [
      // `visible`, not `rendered`. The panel collapses to max-height 0 and
      // keeps its controls, so counting them passes on a closed panel — and a
      // figure of a closed filter panel is exactly what this one must not be.
      visible('#filter-panel'),
      rendered('#filter-panel mat-select', 2),
      visible('.search-field input'),
    ],
  }),
  docTarget({
    name: 'print-list-table',
    route: '/prints',
    selector: '[data-cy="capture-print-table"]',
    viewport: DOC_DESKTOP,
    ready: [
      rendered('[cy-print-row]', DEMO_PRINT_COUNT),
      imagesRendered('app-print-image'),
      // The Materials column, which the caption below this figure describes.
      rendered('app-filament-color-swatch', DEMO_MATERIAL_COUNT),
    ],
  }),
  docTarget({
    name: 'print-list-cards',
    route: '/prints',
    selector: '[data-cy="capture-print-list"]',
    viewport: DOC_HANDSET,
    ready: [
      rendered('app-print-card', DEMO_PRINT_COUNT),
      imagesRendered('app-print-image'),
      rendered('.material-chip', DEMO_MATERIAL_COUNT),
    ],
  }),
];

export const DOC_CAPTURE_SET: CaptureSet = {
  id: 'docs',
  targets: DOC_CAPTURE_TARGETS,
  fixtures: FIXTURE_ROUTES,
  printImages: PRINT_IMAGE_MAP,
  // Deliberately no extra CSS. The docs are documenting the filter panel and
  // the tab actions the home crops hide, so hiding them here would document a
  // product that does not exist.
};
