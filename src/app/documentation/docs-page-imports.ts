import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { DOC_PRIMITIVES } from './primitives';

/**
 * The template scope of every /docs page, generated or hand-written: what a
 * doc's Markdown may use. strictTemplates turns a missing element into a build
 * error, but an attribute directive no import supplies (routerLink, mat-button)
 * is dropped silently, so a page imports this whole list rather than picking.
 *
 * Kept in step with the element allowlist in `scripts/docs-validate-lib.mjs`.
 */
export const DOCS_PAGE_IMPORTS = [
  RouterLink,
  MatButtonModule,
  MatIconModule,
  ...DOC_PRIMITIVES,
];
