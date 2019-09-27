import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PrintDetailComponent } from './print-detail/print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: PrintListComponent },
      {
        path: ':id',
        component: PrintDetailComponent,
        resolve: { print: PrintDetailResolverService },
      },
    ],
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class PrintRoutingModule {}
