import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { HomepageRedirectGuard } from './core/guards/homepage-redirect.guard';
import { CallbackComponent } from './shared/callback/callback.component';
import { FeedbackComponent } from './shared/feedback/feedback.component';
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
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
  },
  {
    path: 'feedback',
    component: FeedbackComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    canActivate: [HomepageRedirectGuard],
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: '**',
    canActivate: [HomepageRedirectGuard],
    redirectTo: '/home',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
