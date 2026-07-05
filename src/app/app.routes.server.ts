import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  // Slicer landing pages are added in later tasks.
  { path: '**', renderMode: RenderMode.Client },
];
