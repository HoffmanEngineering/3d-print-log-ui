import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PrintDetailComponent } from './print-detail/print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintComponent } from './print.component';

@NgModule({
  declarations: [PrintComponent, PrintListComponent, PrintDetailComponent],
  imports: [CommonModule, PrintRoutingModule],
})
export class PrintModule {}
