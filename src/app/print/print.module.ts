import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrintRoutingModule } from './print-routing.module';
import { PrintComponent } from './print.component';
import { PrintListComponent } from './print-list/print-list.component';


@NgModule({
  declarations: [PrintComponent, PrintListComponent],
  imports: [
    CommonModule,
    PrintRoutingModule
  ]
})
export class PrintModule { }
