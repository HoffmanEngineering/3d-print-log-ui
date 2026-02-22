import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdComponent {
  adSlot = input<number | null>(null);
  fullWidthResponsive = input<boolean>(true);
}
