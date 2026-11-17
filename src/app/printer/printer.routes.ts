import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';
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
    providers: provideSectionProviders(),
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
