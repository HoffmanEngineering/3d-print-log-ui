import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { AdsenseModule } from 'ng2-adsense';
import { PrintService } from '../core/services/print.service';
import { SharedModule } from '../shared/shared.module';
import { FileAttachmentSectionComponent } from '../shared/file-attachment-section/file-attachment-section.component';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintCommentsComponent } from './print-comments/print-comments.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintShareDialogComponent } from './print-share-dialog/print-share-dialog.component';

import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { LastFilamentMeasureSettingResolverService } from './resolvers/last-filament-measure-setting-resolver.service';
import { LastSelectedPrinterSettingResolverService } from './resolvers/last-selected-printer-setting-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { CuraParserService } from './services/integration/cura-parser.service';
import { CuraParserV1pt0pt0Service } from './services/integration/cura/cura-parser-v1-0-0.service';
import { CuraParserV1pt1pt0Service } from './services/integration/cura/cura-parser-v1-1-0.service';
import { CuraParserV1pt2pt0Service } from './services/integration/cura/cura-parser-v1-2-0.service';
import { PrintTableLayoutComponent } from './print-list/print-table-layout/print-table-layout.component';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';
import { ProjectChipComponent } from '../shared/project-chip/project-chip.component';
import { ProjectSelectorComponent } from '../shared/project-selector/project-selector.component';
import { PrintGroupedViewComponent } from './print-list/print-grouped-view/print-grouped-view.component';
import { PrintCardComponent } from './print-card/print-card.component';
import { PrintListSkeletonComponent } from './print-list/print-list-skeleton/print-list-skeleton.component';
import { PrintBulkActionBarComponent } from './print-list/print-bulk-action-bar/print-bulk-action-bar.component';
import { PrintEmptyStateComponent } from './print-list/print-empty-state/print-empty-state.component';

@NgModule({
  declarations: [
    PrintListComponent,
    EditPrintDetailComponent,
    PrintShareDialogComponent,
    PrintTableLayoutComponent,
  ],
  imports: [
    CommonModule,
    PrintRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    AdsenseModule,
    FileAttachmentSectionComponent,
    ProjectChipComponent,
    ProjectSelectorComponent,
    MatButtonToggleModule,
    PrintGroupedViewComponent,
    PrintCardComponent,
    PrintCommentsComponent,
    PrintListSkeletonComponent,
    PrintBulkActionBarComponent,
    PrintEmptyStateComponent,
  ],
  providers: [
    PrintDetailResolverService,
    PrintListResolverService,
    PrintService,
    CopyPrintDetailResolverService,
    LastSelectedPrinterSettingResolverService,
    LastFilamentMeasureSettingResolverService,
    FilamentListResolverService,
    CuraParserService,
    CuraParserV1pt0pt0Service,
    CuraParserV1pt1pt0Service,
    CuraParserV1pt2pt0Service,
  ],
})
export class PrintModule {}
