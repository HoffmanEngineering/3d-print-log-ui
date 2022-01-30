import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdsenseModule } from 'ng2-adsense';
import { PrintService } from '../core/services/print.service';
import { SharedModule } from '../shared/shared.module';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintCommentsComponent } from './print-comments/print-comments.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintShareDialogComponent } from './print-share-dialog/print-share-dialog.component';
import { PrintComponent } from './print.component';
import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { LastFilamentMeasureSettingResolverService } from './resolvers/last-filament-measure-setting-resolver.service';
import { LastSelectedPrinterSettingResolverService } from './resolvers/last-selected-printer-setting-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { CuraParserService } from './services/integration/cura-parser.service';
import { CuraParserV1pt0pt0Service } from './services/integration/cura/cura-parser-v1-0-0.service';
import { CuraParserV1pt1pt0Service } from './services/integration/cura/cura-parser-v1-1-0.service';
import { CuraParserV1pt2pt0Service } from './services/integration/cura/cura-parser-v1-2-0.service';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';
import { PrintTableLayoutComponent } from './print-list/print-table-layout/print-table-layout.component';

@NgModule({
  declarations: [
    PrintComponent,
    PrintListComponent,
    EditPrintDetailComponent,
    ViewPrintDetailComponent,
    PrintShareDialogComponent,
    PrintCommentsComponent,
    PrintTableLayoutComponent,
  ],
  imports: [
    CommonModule,
    PrintRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    AdsenseModule,
  ],
  providers: [
    PrintDetailResolverService,
    PrintListResolverService,
    PrintService,
    CopyPrintDetailResolverService,
    LastSelectedPrinterSettingResolverService,
    LastFilamentMeasureSettingResolverService,
    CuraParserService,
    CuraParserV1pt0pt0Service,
    CuraParserV1pt1pt0Service,
    CuraParserV1pt2pt0Service,
  ],
})
export class PrintModule {}
