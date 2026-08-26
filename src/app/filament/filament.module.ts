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
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';
import { FilamentPrintsPanelComponent } from './filament-detail/filament-prints-panel/filament-prints-panel.component';
import { FilamentRemainingCardComponent } from './filament-detail/filament-remaining-card/filament-remaining-card.component';
import { FilamentImagesPanelComponent } from './filament-detail/filament-images-panel/filament-images-panel.component';

@NgModule({
  declarations: [FilamentDetailComponent, FilamentListContainerComponent],
  imports: [
    SharedModule,
    FilamentRoutingModule,
    AdsenseModule,
    EmptyStateComponent,
    FilamentRemainingCardComponent,
    FilamentPrintsPanelComponent,
    FilamentImagesPanelComponent,
  ],
  providers: [
    FilamentListResolverService,
    FilamentDetailResolverService,
    MaterialResolverService,
    CopyFilamentDetailResolverService,
  ],
})
export class FilamentModule {}
