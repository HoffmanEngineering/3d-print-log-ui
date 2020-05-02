import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { DocSidebarComponent } from './doc-sidebar/doc-sidebar.component';
import { DocsAnalyticsComponent } from './docs/docs-analytics/docs-analytics.component';
import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocsPrintersComponent } from './docs/docs-printers/docs-printers.component';
import { DocsPrintsComponent } from './docs/docs-prints/docs-prints.component';
import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocumentationComponent } from './documentation.component';
import { DocsAboutComponent } from './docs/docs-about/docs-about.component';

@NgModule({
  declarations: [
    DocumentationComponent,
    DocSidebarComponent,
    DocsGettingStartedComponent,
    DocsPrintersComponent,
    DocsAnalyticsComponent,
    DocsPrintsComponent,
    DocsAboutComponent,
  ],
  imports: [SharedModule, DocumentationRoutingModule],
})
export class DocumentationModule {}
