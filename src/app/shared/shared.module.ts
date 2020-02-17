import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDatepickerModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginator,
  MatPaginatorModule,
  MatSelectModule,
  MatSliderModule,
  MatTableModule,
  MatToolbarModule,
} from '@angular/material';
import { RouterModule } from '@angular/router';
import { CallbackComponent } from './callback/callback.component';
import { NavbarComponent } from './navbar/navbar.component';
import { UserProfileComponent } from './user-profile/user-profile.component';

@NgModule({
  declarations: [NavbarComponent, CallbackComponent, UserProfileComponent],
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
    MatNativeDateModule,
    MatPaginatorModule,
    FlexLayoutModule,
    MatCardModule,
    MatCheckboxModule,
  ],
})
export class SharedModule {}
