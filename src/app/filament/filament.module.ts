import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { SharedModule } from '../shared/shared.module';

import { FilamentDetailComponent } from './filament-detail/filament-detail.component';
import { FilamentListContainerComponent } from './filament-list-container/filament-list-container.component';
import { FilamentRoutingModule } from './filament-routing.module';
import { CopyFilamentDetailResolverService } from './resolvers/copy-filament-detail-resolver.service';
import { FilamentDetailResolverService } from './resolvers/filament-detail-resolver.service';
import { FilamentListResolverService } from './resolvers/filament-list-resolver.service';
import { MaterialResolverService } from './resolvers/material-resolver.service';

@NgModule({
  declarations: [FilamentDetailComponent, FilamentListContainerComponent],
  imports: [SharedModule, FilamentRoutingModule, AdsenseModule],
  providers: [
    FilamentListResolverService,
    FilamentDetailResolverService,
    MaterialResolverService,
    CopyFilamentDetailResolverService,
  ],
})
export class FilamentModule {}
