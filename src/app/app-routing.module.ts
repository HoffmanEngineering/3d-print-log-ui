import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { CallbackComponent } from './shared/callback/callback.component';
import { UserProfileComponent } from './shared/user-profile/user-profile.component';

const routes: Routes = [
  {
    path: 'callback',
    component: CallbackComponent,
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'prints',
    loadChildren: () => import('./print/print.module').then(m => m.PrintModule),
  },
  {
    path: 'printers',
    loadChildren: () =>
      import('./printer/printer.module').then(m => m.PrinterModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
