// Single source of truth for the prerendered marketing routes and site origin.
// Imported by scripts/verify-prerender.mjs and scripts/generate-sitemap.mjs.
export const SITE_ORIGIN = 'https://www.3dprintlog.com';

export const TIER1 = ['cura', 'prusaslicer', 'bambu-studio', 'creality-print'];
export const HUB = 'orcaslicer';
export const FORKS = [
  'snapmaker-orca',
  'anycubic-slicer',
  'elegoo-slicer',
  'qidi-studio',
  'orca-flashforge',
];

// '' is the homepage. Order is cosmetic.
export const MARKETING_ROUTES = ['', ...TIER1, HUB, ...FORKS];

// Public documentation pages that are prerendered for SEO. These are pure static
// content (no auth, no API). Kept separate from MARKETING_ROUTES so the
// marketing-only checks (fork hooks, hub links, homepage graph) don't apply.
export const DOC_ROUTES = [
  'docs/getting-started',
  'docs/pro-subscription',
  'docs/prints',
  'docs/projects',
  'docs/materials',
  'docs/printers',
  'docs/analytics',
  'docs/android-app',
  'docs/cura-plugin',
  'docs/octoprint-webhook',
  'docs/klipper',
  'docs/slic3r-uploader',
  'docs/release-notes',
  'docs/about',
  'docs/privacy-policy',
];
