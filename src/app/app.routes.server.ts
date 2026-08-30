import { RenderMode, ServerRoute } from '@angular/ssr';

import { DOCS_SERVER_ROUTES } from './documentation/generated/docs.server-routes';

/** Marketing pages, prerendered for SEO. Kept in sync with scripts/marketing-routes.mjs. */
const marketingRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'cura', renderMode: RenderMode.Prerender },
  { path: 'prusaslicer', renderMode: RenderMode.Prerender },
  { path: 'bambu-studio', renderMode: RenderMode.Prerender },
  { path: 'creality-print', renderMode: RenderMode.Prerender },
  { path: 'orcaslicer', renderMode: RenderMode.Prerender },
  { path: 'snapmaker-orca', renderMode: RenderMode.Prerender },
  { path: 'anycubic-slicer', renderMode: RenderMode.Prerender },
  { path: 'elegoo-slicer', renderMode: RenderMode.Prerender },
  { path: 'qidi-studio', renderMode: RenderMode.Prerender },
  { path: 'orca-flashforge', renderMode: RenderMode.Prerender },
];

/**
 * The catch-all is appended structurally, after the generated doc routes, so a
 * generated entry can never shadow it and it can never shadow a doc page.
 */
export const serverRoutes: ServerRoute[] = [
  ...marketingRoutes,
  ...DOCS_SERVER_ROUTES,
  { path: '**', renderMode: RenderMode.Client },
];
