import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PrintDetailComponent } from './print-detail/print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintComponent } from './print.component';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';

@NgModule({
  declarations: [PrintComponent, PrintListComponent, PrintDetailComponent],
  imports: [CommonModule, PrintRoutingModule, FormsModule, ReactiveFormsModule],
  providers: [PrintDetailResolverService],
})
export class PrintModule {}
