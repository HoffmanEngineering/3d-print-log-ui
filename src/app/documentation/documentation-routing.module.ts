import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocsPrintersComponent } from './docs/docs-printers/docs-printers.component';
import { DocumentationComponent } from './documentation.component';

const routes: Routes = [
  {
    path: '', // /docs
    component: DocumentationComponent,
    children: [
      {
        path: 'getting-started',
        component: DocsGettingStartedComponent,
      },
      { path: 'printers', component: DocsPrintersComponent },
      { path: '', redirectTo: 'getting-started' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentationRoutingModule {}
