import { DecimalPipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PrintStatistic } from '../services/print-statistics.service';

@Component({
  selector: 'app-total-filament-used',
  templateUrl: './total-filament-used.component.html',
  styleUrls: ['./total-filament-used.component.scss'],
  providers: [DecimalPipe],
})
export class TotalFilamentUsedComponent implements OnChanges {
  @Input() prints: PrintStatistic[] = [];

  public filamentUsedInGrams = '';

  constructor(private decimalPipe: DecimalPipe) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.prints) {
      this.calculatePrintCount();
    }
  }

  calculatePrintCount() {
    const totalFilamentUsedMg = this.prints.reduce(
      (accumulatedFilamentUsedMg, print) => {
        const filamentUsedMg =
          isFinite(print.filamentUsageMg) && print.filamentUsageMg > 0
            ? +print.filamentUsageMg
            : isFinite(print.estimatedFilamentUsageMg) &&
                print.estimatedFilamentUsageMg > 0
              ? +print.estimatedFilamentUsageMg
              : 0;

        return accumulatedFilamentUsedMg + filamentUsedMg;
      },
      0
    );

    const formattedFilament = this.decimalPipe.transform(
      totalFilamentUsedMg / 1000,
      '1.0-3'
    );

    this.filamentUsedInGrams = `${formattedFilament} grams`;
  }
}
