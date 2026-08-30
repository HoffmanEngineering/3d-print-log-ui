import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DOCS_ROUTES } from './generated/docs.routes';
import { DocumentationComponent } from './documentation.component';

const routes: Routes = [
  {
    path: '', // /docs
    component: DocumentationComponent,
    // Page routes, alias redirects, and the default child route are all generated
    // from src/content/docs/*.md — see scripts/build-docs.mjs.
    children: DOCS_ROUTES,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentationRoutingModule {}
