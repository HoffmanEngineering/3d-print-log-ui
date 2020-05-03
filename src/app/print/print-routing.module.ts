import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { CurrentUserPrinterSummaryResolverService } from '../core/resolvers/current-user-printer-summary-resolver.service';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: PrintListComponent,
        resolve: { printList: PrintListResolverService },
      },
      {
        path: 'copy/:id',
        component: EditPrintDetailComponent,
        resolve: {
          print: CopyPrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: ':id/edit',
        component: EditPrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: ':id',
        component: ViewPrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
        },
      },
    ],
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class PrintRoutingModule {}
