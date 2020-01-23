import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterRoutingModule } from './printer-routing.module';
import { PrinterListResolverService } from './resolvers/printer-list-resolver.service';
import { PrinterService } from './services/printer.service';

@NgModule({
  declarations: [PrinterListComponent, PrinterDetailComponent],
  imports: [SharedModule, PrinterRoutingModule],
  providers: [PrinterService, PrinterListResolverService],
})
export class PrinterModule {}
