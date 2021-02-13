import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApikeysComponent } from './apikeys.component';

const routes: Routes = [{ path: '', component: ApikeysComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApikeysRoutingModule {}
