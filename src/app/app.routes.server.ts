import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
  { path: '**', renderMode: RenderMode.Client },
];
