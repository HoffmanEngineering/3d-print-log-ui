import { Component, Input } from '@angular/core';

/**
 * The card only renders these four fields, so it accepts anything that carries
 * them. That covers both `PrintSummary` and the narrower `PrintFeedSummary`.
 */
export interface PrintSummaryCardPrint {
  id: number;
  title: string;
  startDate?: Date;
  defaultPrintImageId: number;
}

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
  @Input() print: PrintSummaryCardPrint;

  constructor() {}
}
