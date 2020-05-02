import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterDetailResolverService } from './resolvers/printer-detail-resolver.service';
import { PrinterListResolverService } from './resolvers/printer-list-resolver.service';
import { PendingChangesGuard } from '../core/guards/pending-changes.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: PrinterListComponent,
        resolve: { printerList: PrinterListResolverService },
      },
      {
        path: ':id',
        component: PrinterDetailComponent,
        resolve: {
          printer: PrinterDetailResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrinterRoutingModule {}
