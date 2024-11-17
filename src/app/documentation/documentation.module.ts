import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';
import { DocSidebarComponent } from './doc-sidebar/doc-sidebar.component';
import { DocsAboutComponent } from './docs/docs-about/docs-about.component';
import { DocsAnalyticsComponent } from './docs/docs-analytics/docs-analytics.component';
import { DocsCuraPluginComponent } from './docs/docs-cura-plugin/docs-cura-plugin.component';
import { DocsFilamentsComponent } from './docs/docs-filaments/docs-filaments.component';
import { DocsGettingStartedComponent } from './docs/docs-getting-started/docs-getting-started.component';
import { DocsOctoprintWebhookComponent } from './docs/docs-octoprint-webhook/docs-octoprint-webhook.component';
import { DocsPrintersComponent } from './docs/docs-printers/docs-printers.component';
import { DocsPrintsComponent } from './docs/docs-prints/docs-prints.component';
import { DocsReleaseNotesComponent } from './docs/docs-release-notes/docs-release-notes.component';
import { DocumentationRoutingModule } from './documentation-routing.module';
import { DocumentationComponent } from './documentation.component';
import { DocsAndroidAppComponent } from './docs/docs-android-app/docs-android-app.component';
import { DocsMoonrakerComponent } from './docs/docs-moonraker/docs-moonraker.component';
import { DocsTermsComponent } from './docs/docs-terms/docs-terms.component';
import { DocsPrivacyPolicyComponent } from './docs/docs-privacy-policy/docs-privacy-policy.component';
import { DocsSlic3rUploaderComponent } from './docs/docs-slic3r-uploader/docs-slic3r-uploader.component';

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
    DocsReleaseNotesComponent,
    DocsFilamentsComponent,
    DocsOctoprintWebhookComponent,
    DocsMoonrakerComponent,
    DocsAndroidAppComponent,
    DocsTermsComponent,
    DocsPrivacyPolicyComponent,
    DocsSlic3rUploaderComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    DocumentationRoutingModule,
    AdsenseModule,
    YouTubePlayerModule,
  ],
})
export class DocumentationModule {}
