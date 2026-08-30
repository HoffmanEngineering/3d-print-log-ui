import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';
import { DocSidebarComponent } from './doc-sidebar/doc-sidebar.component';
import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocFeedbackComponent } from './doc-feedback/doc-feedback.component';
import { DocsTelemetryService } from './docs-telemetry.service';
import { DocumentationComponent } from './documentation.component';
import { DOCS_PAGE_COMPONENTS } from './generated/docs-declarations';

@NgModule({
  declarations: [
    DocumentationComponent,
    DocSidebarComponent,
    // Pages compiled from src/content/docs/*.md. They are declared here rather
    // than made standalone so they keep this module's template scope —
    // RouterLink, MatIcon and <youtube-player> are all used by doc templates,
    // and strictTemplates makes a missing directive a build error.
    ...DOCS_PAGE_COMPONENTS,
    // Pages that keep a hand-written component (the `component:` escape hatch).
    // docs-getting-started injects AuthService and Router for auth-aware content
    // on a public route.
    DocsGettingStartedComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    DocumentationRoutingModule,
    AdsenseModule,
    YouTubePlayerModule,
    DocFeedbackComponent,
  ],
  providers: [DocsTelemetryService],
})
export class DocumentationModule {}
