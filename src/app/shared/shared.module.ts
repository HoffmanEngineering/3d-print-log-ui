import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDividerModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSortModule,
  MatTableModule,
  MatToolbarModule,
} from '@angular/material';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { RouterModule } from '@angular/router';
import { CallbackComponent } from './callback/callback.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { UserProfileComponent } from './user-profile/user-profile.component';

@NgModule({
  declarations: [
    NavbarComponent,
    CallbackComponent,
    UserProfileComponent,
    FeedbackComponent,
    SidebarComponent,
  ],
  imports: [
    CommonModule,
    MatMenuModule,
    MatSliderModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    FlexLayoutModule,
    MatCardModule,
    MatCheckboxModule,
    RouterModule.forChild([]),
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatSortModule,
    MatSidenavModule,
    MatListModule,
    MatSliderModule,
    MatSlideToggleModule,
  ],
  exports: [
    NavbarComponent,
    CallbackComponent,
    UserProfileComponent,
    CommonModule,
    MatMenuModule,
    MatSliderModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatPaginatorModule,
    MatDividerModule,
    FlexLayoutModule,
    MatCardModule,
    MatCheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatSortModule,
    MatSidenavModule,
    MatListModule,
    SidebarComponent,
    MatSliderModule,
    MatSlideToggleModule,
  ],
})
export class SharedModule {}
