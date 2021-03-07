import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DocsAboutComponent } from './docs/docs-about/docs-about.component';
import { DocsAnalyticsComponent } from './docs/docs-analytics/docs-analytics.component';
import { DocsCuraPluginComponent } from './docs/docs-cura-plugin/docs-cura-plugin.component';
import { DocsFilamentsComponent } from './docs/docs-filaments/docs-filaments.component';
import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocsOctoprintWebhookComponent } from './docs/docs-octoprint-webhook/docs-octoprint-webhook.component';
import { DocsPrintersComponent } from './docs/docs-printers/docs-printers.component';
import { DocsPrintsComponent } from './docs/docs-prints/docs-prints.component';
import { DocsReleaseNotesComponent } from './docs/docs-release-notes/docs-release-notes.component';
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
      { path: 'prints', component: DocsPrintsComponent },
      { path: 'filaments', component: DocsFilamentsComponent },
      { path: 'analytics', component: DocsAnalyticsComponent },
      { path: 'cura-plugin', component: DocsCuraPluginComponent },
      { path: 'octoprint-webhook', component: DocsOctoprintWebhookComponent },
      { path: 'release-notes', component: DocsReleaseNotesComponent },
      { path: 'about', component: DocsAboutComponent },
      { path: '', redirectTo: 'getting-started' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentationRoutingModule {}
