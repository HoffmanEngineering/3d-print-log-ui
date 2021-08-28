import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { FilamentDetailComponent } from './filament-detail/filament-detail.component';
import { FilamentListContainerComponent } from './filament-list-container/filament-list-container.component';
import { CopyFilamentDetailResolverService } from './resolvers/copy-filament-detail-resolver.service';

import { FilamentDetailResolverService } from './resolvers/filament-detail-resolver.service';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';
import { MaterialResolverService } from './resolvers/material-resolver.service';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: FilamentListContainerComponent,
        resolve: {
          filamentList: FilamentListResolverService,
        },
      },
      {
        path: 'copy/:id',
        component: FilamentDetailComponent,
        resolve: {
          filament: CopyFilamentDetailResolverService,
          materials: MaterialResolverService,
        },
        canDeactivate: [PendingChangesGuard],
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
