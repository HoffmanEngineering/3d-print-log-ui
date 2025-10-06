import { Component, Input } from '@angular/core';
import { PrintSummary } from 'src/app/core/services/print.service';

@Component({
  selector: 'app-print-summary-card',
  templateUrl: './print-summary-card.component.html',
  styleUrls: ['./print-summary-card.component.scss'],
  standalone: false,
})
export class PrintSummaryCardComponent {
  @Input() userProfilePictureUrl: string = null;
  @Input() userName: string = null;
  @Input() userId: number = null;
  @Input() print: PrintSummary;

  constructor() {}
}
