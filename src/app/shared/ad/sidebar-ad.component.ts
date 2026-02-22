import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AD_SLOTS } from './ad-slots';

@Component({
  selector: 'app-sidebar-ad',
  template: `<app-ad
    [adSlot]="AD_SLOTS.SIDEBAR"
    [fullWidthResponsive]="false"
  ></app-ad>`,
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarAdComponent {
  readonly AD_SLOTS = AD_SLOTS;
}
