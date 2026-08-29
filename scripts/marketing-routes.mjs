// Single source of truth for the prerendered marketing routes and site origin.
// Imported by scripts/verify-prerender.mjs and scripts/generate-sitemap.mjs.
import fs from 'node:fs';

import { MANIFEST_JSON } from './docs-paths.mjs';

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
//
// Derived from the generated docs manifest, which is the canonical artifact —
// this list used to be hand-maintained and was one of the seven places a new doc
// page had to be registered. The exported shape is unchanged, so every existing
// importer (generate-sitemap.mjs, verify-prerender.mjs) is untouched.
//
// The manifest is JSON, not TypeScript, precisely so these plain-Node scripts can
// read it: they run on Node with no TS loader.
export const DOC_ROUTES = readDocRoutes();

function readDocRoutes() {
  if (!fs.existsSync(MANIFEST_JSON)) {
    throw new Error(
      `Docs manifest is missing (${MANIFEST_JSON}). Run \`npm run docs:generate\` first.`
    );
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_JSON, 'utf8'));
  return manifest.pages.filter((page) => !page.dormant).map((page) => page.path);
}
