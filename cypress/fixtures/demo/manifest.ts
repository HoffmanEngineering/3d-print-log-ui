// Single source of truth for the capture pipeline.
// - `FIXTURE_ROUTES`: endpoint glob -> fixture file (relative to cypress/fixtures).
//   The capture spec registers a catch-all offline guard first, then these, so
//   these specific stubs win (Cypress matches non-middleware intercepts in
//   reverse definition order).
// - `CAPTURE_TARGETS`: logical image name -> capture selector + route + output base.
export interface FixtureRoute {
  method: 'GET';
  /**
   * Cypress glob (case-sensitive) or a RegExp.
   *
   * Reach for the RegExp when a query value can contain an unencoded `/`.
   * Cypress matches globs with minimatch, which is a PATH matcher: `*` never
   * crosses a slash, and a trailing `**` only spans segments when it stands
   * alone as a segment. Angular's HttpParams leaves `/` unencoded, so
   * `timeZone=America/New_York` splits the query into two path segments and
   * `**\/api/analytics/overview*` silently stops matching — the request falls
   * through to the offline guard and the page renders its error state.
   */
  url: string | RegExp;
  fixture: string; // path under cypress/fixtures
}

export interface CaptureTarget {
  name: string; // logical name, e.g. 'PrinterList'
  route: string; // '/prints'
  selector: string; // '[data-cy="home-capture-prints"]'
  outputBase: string; // 'Homepage_PrinterList'
  // Capture viewport [width, height]. Every target is captured narrow: the list
  // pages switch to their stacked card view below ~600px and the analytics
  // overview tab stacks its tiles and charts, giving the portrait crop the home
  // feature slots are laid out for.
  viewport: [number, number];
}

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

export const CAPTURE_TARGETS: CaptureTarget[] = [
  {
    name: 'PrinterList',
    route: '/prints',
    selector: '[data-cy="home-capture-prints"]',
    outputBase: 'Homepage_PrinterList',
    viewport: [560, 1100],
  },
  {
    name: 'Filament',
    route: '/materials',
    selector: '[data-cy="home-capture-materials"]',
    outputBase: 'Homepage_Filament',
    viewport: [560, 1100],
  },
  {
    name: 'Analytics',
    route: '/analytics',
    selector: '[data-cy="home-capture-analytics"]',
    outputBase: 'Homepage_Analytics',
    viewport: [720, 1500],
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
