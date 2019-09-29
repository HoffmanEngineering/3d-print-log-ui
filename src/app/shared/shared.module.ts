import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
  MatButtonModule,
  MatCardModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
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
    FlexLayoutModule,
    MatCardModule,
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
    FlexLayoutModule,
    MatCardModule,
  ],
})
export class SharedModule {}
