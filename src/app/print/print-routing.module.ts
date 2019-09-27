import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CurrentUserPrinterSummaryResolverService } from '../core/resolvers/current-user-printer-summary-resolver.service';
import { PrintDetailComponent } from './print-detail/print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';

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
        path: ':id',
        component: PrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
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
