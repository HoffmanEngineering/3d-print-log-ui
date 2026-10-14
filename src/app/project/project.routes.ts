import { Routes } from '@angular/router';
import { ProjectDetailComponent } from './project-detail/project-detail.component';

export const PROJECT_ROUTES: Routes = [
  { path: ':id', component: ProjectDetailComponent },
];
