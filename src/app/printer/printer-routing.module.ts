import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { pendingChangesGuard } from '../core/guards/pending-changes.guard';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { printerDetailResolver } from './resolvers/printer-detail.resolver';
import { printerListResolver } from './resolvers/printer-list.resolver';
import { printerCategoriesResolver } from '../core/resolvers/printer-categories.resolver';
import { materialCategoriesResolver } from '../core/resolvers/material-categories.resolver';

export const printerRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: PrinterListComponent,
        canActivate: [authGuard],
        resolve: { printerList: printerListResolver },
      },
      {
        path: ':id',
        component: PrinterDetailComponent,
        canActivate: [authGuard],
        resolve: {
          printer: printerDetailResolver,
          printerCategories: printerCategoriesResolver,
          materialCategories: materialCategoriesResolver,
        },
        canDeactivate: [pendingChangesGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(printerRoutes)],
  exports: [RouterModule],
})
export class PrinterRoutingModule {}
