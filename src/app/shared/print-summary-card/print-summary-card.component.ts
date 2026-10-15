import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
} from '@angular/material/card';
import { RouterLink } from '@angular/router';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultLayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { PrintImageComponent } from '../print-image/print-image.component';
import { LocaleDatePipe } from '../pipes/locale-date.pipe';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatCardTitle,
    RouterLink,
    MatCardSubtitle,
    MatCardContent,
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    DefaultLayoutGapDirective,
    PrintImageComponent,
    LocaleDatePipe,
  ],
})
export class PrintSummaryCardComponent {
  readonly userProfilePictureUrl = input<string>(null);
  readonly userName = input<string>(null);
  readonly userId = input<number>(null);
  readonly print = input.required<PrintSummaryCardPrint>();
}
