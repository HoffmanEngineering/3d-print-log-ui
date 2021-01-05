import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FilamentListComponent } from './filament-list/filament-list.component';

import { FilamentComponent } from './filament.component';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: FilamentListComponent,
        resolve: { filamentList: FilamentListResolverService },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FilamentRoutingModule {}
