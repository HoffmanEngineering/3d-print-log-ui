import { NgModule } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

import { SharedModule } from '../shared/shared.module';
import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
  declarations: [HomeComponent],
  imports: [SharedModule, HomeRoutingModule, NgOptimizedImage],
})
export class HomeModule {}
