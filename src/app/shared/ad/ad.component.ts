import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
  standalone: false,
})
export class AdComponent {
  @Input() adSlot: number = null;
  @Input() fullWidthResponsive: boolean = true;
}
