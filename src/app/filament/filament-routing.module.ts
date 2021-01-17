import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { FilamentDetailComponent } from './filament-detail/filament-detail.component';
import { FilamentListComponent } from './filament-list/filament-list.component';

import { FilamentComponent } from './filament.component';
import { FilamentDetailResolverService } from './resolvers/filament-detail-resolver.service';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';
import { MaterialResolverService } from './resolvers/material-resolver.service';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: FilamentListComponent,
        resolve: {
          filamentList: FilamentListResolverService,
        },
        runGuardsAndResolvers: 'always',
      },
      {
        path: ':id',
        component: FilamentDetailComponent,
        resolve: {
          filament: FilamentDetailResolverService,
          materials: MaterialResolverService,
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
export class FilamentRoutingModule {}
