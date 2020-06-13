import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdsenseModule } from 'ng2-adsense';
import { PrintService } from '../core/services/print.service';
import { SharedModule } from '../shared/shared.module';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintShareDialogComponent } from './print-share-dialog/print-share-dialog.component';
import { PrintComponent } from './print.component';
import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { LastSelectedPrinterSettingResolverService } from './resolvers/last-selected-printer-setting-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';

@NgModule({
  declarations: [
    PrintComponent,
    PrintListComponent,
    EditPrintDetailComponent,
    ViewPrintDetailComponent,
    PrintShareDialogComponent,
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
  ],
})
export class PrintModule {}
