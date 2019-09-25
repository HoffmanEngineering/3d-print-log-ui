import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PrintListComponent } from './print-list/print-list.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: PrintListComponent },
      { path: ':id', component: PrintListComponent },
    ],
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class PrintRoutingModule {}
