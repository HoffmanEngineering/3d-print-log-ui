import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';

import { FilamentDetailComponent } from './filament-detail/filament-detail.component';
import { FilamentListComponent } from './filament-list/filament-list.component';
import { FilamentRoutingModule } from './filament-routing.module';
import { FilamentComponent } from './filament.component';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';

@NgModule({
  declarations: [
    FilamentComponent,
    FilamentListComponent,
    FilamentDetailComponent,
  ],
  imports: [SharedModule, FilamentRoutingModule, AdsenseModule],
  providers: [FilamentListResolverService],
})
export class FilamentModule {}
