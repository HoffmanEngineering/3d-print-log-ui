import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { authGuard } from '../core/guards/auth.guard';
import { pendingChangesGuard } from '../core/guards/pending-changes.guard';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { printerDetailResolver } from './resolvers/printer-detail.resolver';
import { printerListResolver } from './resolvers/printer-list.resolver';
import { printerCategoriesResolver } from '../core/resolvers/printer-categories.resolver';
import { materialCategoriesResolver } from '../core/resolvers/material-categories.resolver';

export const PRINTER_ROUTES: Routes = [
  {
    path: '',
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
    children: [
      {
        path: '',
        component: PrinterListComponent,
        canActivate: [authGuard],
        resolve: { printerList: printerListResolver },
      },
      {
        // Before ':id'. Lazy: only bridge owners open it (printlog-bridge#100).
        path: 'bridges',
        loadComponent: () =>
          import('./bridges/bridges-page/bridges-page.component').then(
            (m) => m.BridgesPageComponent
          ),
        canActivate: [authGuard],
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
