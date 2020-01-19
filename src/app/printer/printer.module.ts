import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterRoutingModule } from './printer-routing.module';
import { PrinterListResolverService } from './resolvers/printer-list-resolver.service';
import { PrinterService } from './services/printer.service';

@NgModule({
  declarations: [PrinterListComponent, PrinterDetailComponent],
  imports: [CommonModule, PrinterRoutingModule],
  providers: [PrinterService, PrinterListResolverService],
})
export class PrinterModule {}
