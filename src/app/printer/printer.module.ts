import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterRoutingModule } from './printer-routing.module';
import { PrinterDetailResolverService } from './resolvers/printer-detail-resolver.service';
import { PrinterListResolverService } from './resolvers/printer-list-resolver.service';

@NgModule({
  declarations: [PrinterListComponent, PrinterDetailComponent],
  imports: [
    SharedModule,
    PrinterRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [PrinterListResolverService, PrinterDetailResolverService],
})
export class PrinterModule {}
