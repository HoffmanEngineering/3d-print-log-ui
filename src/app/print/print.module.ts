import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintImageComponent } from './print-image/print-image.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintComponent } from './print.component';
import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { PrintService } from './services/print.service';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';

@NgModule({
  declarations: [
    PrintComponent,
    PrintListComponent,
    EditPrintDetailComponent,
    PrintImageComponent,
    ViewPrintDetailComponent,
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
  ],
})
export class PrintModule {}
