import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocumentationComponent } from './documentation.component';
import { DocSidebarComponent } from './doc-sidebar/doc-sidebar.component';
import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocsPrintersComponent } from './docs/docs-printers/docs-printers.component';

@NgModule({
  declarations: [DocumentationComponent, DocSidebarComponent, DocsGettingStartedComponent, DocsPrintersComponent],
  imports: [SharedModule, DocumentationRoutingModule],
})
export class DocumentationModule {}
