import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AD_SLOTS } from './ad-slots';
import { AdComponent } from './ad.component';

@Component({
  selector: 'app-sidebar-ad',
  template: `<app-ad
    [adSlot]="AD_SLOTS.SIDEBAR"
    [fullWidthResponsive]="false"
  ></app-ad>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdComponent],
})
export class SidebarAdComponent {
  readonly AD_SLOTS = AD_SLOTS;
}
