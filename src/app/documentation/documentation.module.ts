import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocumentationComponent } from './documentation.component';
import { DocSidebarComponent } from './doc-sidebar/doc-sidebar.component';

@NgModule({
  declarations: [DocumentationComponent, DocSidebarComponent],
  imports: [SharedModule, DocumentationRoutingModule],
})
export class DocumentationModule {}
