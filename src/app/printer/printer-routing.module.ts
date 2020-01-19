import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterListResolverService } from './resolvers/printer-list-resolver.service';

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
        // resolve: {
        //   print: PrintDetailResolverService,
        //   printers: CurrentUserPrinterSummaryResolverService,
        // },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrinterRoutingModule {}
