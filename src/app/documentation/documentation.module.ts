import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';
import { DocSidebarComponent } from './doc-sidebar/doc-sidebar.component';
import { DocsAboutComponent } from './docs/docs-about/docs-about.component';
import { DocsAnalyticsComponent } from './docs/docs-analytics/docs-analytics.component';
import { DocsCuraPluginComponent } from './docs/docs-cura-plugin/docs-cura-plugin.component';
import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocsPrintersComponent } from './docs/docs-printers/docs-printers.component';
import { DocsPrintsComponent } from './docs/docs-prints/docs-prints.component';
import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocumentationComponent } from './documentation.component';

@NgModule({
  declarations: [
    DocumentationComponent,
    DocSidebarComponent,
    DocsGettingStartedComponent,
    DocsPrintersComponent,
    DocsAnalyticsComponent,
    DocsPrintsComponent,
    DocsAboutComponent,
    DocsCuraPluginComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    DocumentationRoutingModule,
    AdsenseModule,
  ],
})
export class DocumentationModule {}
