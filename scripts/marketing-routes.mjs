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
