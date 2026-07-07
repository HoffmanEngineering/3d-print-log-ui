// Single source of truth for the capture pipeline.
// - `FIXTURE_ROUTES`: endpoint glob -> fixture file (relative to cypress/fixtures).
//   The capture spec registers a catch-all offline guard first, then these, so
//   these specific stubs win (Cypress matches non-middleware intercepts in
//   reverse definition order).
// - `CAPTURE_TARGETS`: logical image name -> capture selector + route + output base.
export interface FixtureRoute {
  method: 'GET';
  url: string; // Cypress glob, case-sensitive
  fixture: string; // path under cypress/fixtures
}

export interface CaptureTarget {
  name: string; // logical name, e.g. 'PrinterList'
  route: string; // '/prints'
  selector: string; // '[data-cy="home-capture-prints"]'
  outputBase: string; // 'Homepage_PrinterList'
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
    url: '**/api/Prints/stats*',
    fixture: 'demo/prints-stats.json',
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
  },
  {
    name: 'Filament',
    route: '/materials',
    selector: '[data-cy="home-capture-materials"]',
    outputBase: 'Homepage_Filament',
  },
  {
    name: 'Analytics',
    route: '/analytics',
    selector: '[data-cy="home-capture-analytics"]',
    outputBase: 'Homepage_Analytics',
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
