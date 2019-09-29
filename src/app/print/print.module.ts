import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { PrintDetailComponent } from './print-detail/print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintRoutingModule } from './print-routing.module';
import { PrintComponent } from './print.component';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { PrintService } from './services/print.service';

@NgModule({
  declarations: [PrintComponent, PrintListComponent, PrintDetailComponent],
  imports: [
    CommonModule,
    PrintRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
  ],
  providers: [
    PrintDetailResolverService,
    PrintListResolverService,
    PrintService,
  ],
})
export class PrintModule {}
