import { Routes } from '@angular/router';

import { DocsSearchOpener } from './docs-search/docs-search.opener';
import { DocsSearchService } from './docs-search/docs-search.service';
import { DocsTelemetryService } from './docs-telemetry.service';
import { DocumentationComponent } from './documentation.component';
import { DOCS_ROUTES } from './generated/docs.routes';

export const DOCUMENTATION_ROUTES: Routes = [
  {
    path: '', // /docs
    component: DocumentationComponent,
    // Provided here, not in root: search is only reachable from /docs, so these
    // stay in the lazy docs chunk rather than the main bundle.
    providers: [DocsTelemetryService, DocsSearchService, DocsSearchOpener],
    // Page routes, alias redirects, and the default child route are all generated
    // from src/content/docs/*.md — see scripts/build-docs.mjs.
    children: DOCS_ROUTES,
  },
];
