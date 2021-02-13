import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';

import { ApikeysRoutingModule } from './apikeys-routing.module';
import { ApikeysComponent } from './apikeys.component';

@NgModule({
  declarations: [ApikeysComponent],
  imports: [SharedModule, ApikeysRoutingModule],
})
export class ApikeysModule {}
