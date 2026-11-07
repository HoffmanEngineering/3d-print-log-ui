import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AdSlotComponent } from './ad-slot.component';
import { AdEligibilityService } from './ad-eligibility.service';
import { AD_SLOTS } from './ad-slots';

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
  imports: [AdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdComponent {
  readonly AD_SLOTS = AD_SLOTS;
  /** Defaults to the responsive display unit, {@link AD_SLOTS.DEFAULT}. */
  readonly adSlot = input<number | null>(null);
  readonly fullWidthResponsive = input<boolean>(true);
  /** False for Pro users, in the iOS app, and until we know which this visitor is. */
  readonly showAd = inject(AdEligibilityService).canShowAds;
}
