import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterDetailResolverService } from './resolvers/printer-detail-resolver.service';
import { PrinterListResolverService } from './resolvers/printer-list-resolver.service';
import { PrinterCategoryResolverService } from '../core/resolvers/printer-category-resolver.service';
import { MaterialCategoryResolverService } from '../core/resolvers/material-category-resolver.service';

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
          printerCategories: PrinterCategoryResolverService,
          materialCategories: MaterialCategoryResolverService,
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
