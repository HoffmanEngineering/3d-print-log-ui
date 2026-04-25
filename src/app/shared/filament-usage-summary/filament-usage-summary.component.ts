import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import {
  FilamentPrice,
  FilamentPriceInvalid,
  PrintFilamentSummaryDto,
  PrintService,
} from 'src/app/core/services/print.service';

@Component({
  selector: 'app-filament-usage-summary',
  templateUrl: './filament-usage-summary.component.html',
  styleUrls: ['./filament-usage-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatTooltipModule],
})
export class FilamentUsageSummaryComponent {
  private readonly printService = inject(PrintService);

  filamentUsage = input<PrintFilamentSummaryDto[]>([]);
  defaultFilamentPrice = input<string | null | undefined>(null);
  currencySymbol = input<string>('$');

  getActualPrice(fu: PrintFilamentSummaryDto): string {
    return this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament: fu.filament,
        source: fu.source,
        weightG: fu.amountMg > 0 ? fu.amountMg / 1000 : undefined,
        lengthM: fu.lengthInM,
        volumeMl: fu.volumeMl,
        currencySymbol: this.currencySymbol(),
        defaultFilamentPrice: this.defaultFilamentPrice() ?? undefined,
      })
    );
  }

  getEstimatedPrice(fu: PrintFilamentSummaryDto): string {
    return this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament: fu.filament,
        source: fu.estimatedSource,
        weightG:
          fu.estimatedAmountMg > 0 ? fu.estimatedAmountMg / 1000 : undefined,
        lengthM: fu.estimatedLengthInM,
        volumeMl: fu.estimatedVolumeMl,
        currencySymbol: this.currencySymbol(),
        defaultFilamentPrice: this.defaultFilamentPrice() ?? undefined,
      })
    );
  }

  private formatFilamentPrice(price: FilamentPrice): string {
    if (price.valid) {
      return price.formattedPrice + (price.usesDefaultPrice ? '*' : '');
    }
    return (price as FilamentPriceInvalid).message;
  }
}
