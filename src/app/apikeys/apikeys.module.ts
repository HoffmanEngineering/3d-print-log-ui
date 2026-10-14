import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';

import { ApikeysRoutingModule } from './apikeys-routing.module';
import { ApikeysComponent } from './apikeys.component';

@NgModule({
  imports: [SharedModule, ApikeysRoutingModule, ApikeysComponent],
})
export class ApikeysModule {}
