import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrinterMaintenanceRoutingModule } from './printer-maintenance-routing.module';
import { PrinterMaintenanceComponent } from './printer-maintenance.component';
import { SharedModule } from '../shared/shared.module';
import { PrinterAvatarComponent } from '../shared/printer-avatar/printer-avatar.component';

@NgModule({
  declarations: [PrinterMaintenanceComponent],
  imports: [
    CommonModule,
    PrinterMaintenanceRoutingModule,
    SharedModule,
    PrinterAvatarComponent,
  ],
})
export class PrinterMaintenanceModule {}
