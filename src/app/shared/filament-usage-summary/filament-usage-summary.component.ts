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
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintService,
} from 'src/app/core/services/print.service';
import { FilamentColorSwatchComponent } from 'src/app/shared/filament-color-swatch/filament-color-swatch.component';
import {
  FilamentPreferredDisplayResult,
  getFilamentPreferredDisplay,
} from 'src/app/shared/utils/filament-display.utils';

@Component({
  selector: 'app-filament-usage-summary',
  templateUrl: './filament-usage-summary.component.html',
  styleUrls: ['./filament-usage-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatTooltipModule,
    FilamentColorSwatchComponent,
  ],
})
export class FilamentUsageSummaryComponent {
  private readonly printService = inject(PrintService);

  filamentUsage = input<PrintFilamentSummaryDto[]>([]);
  defaultFilamentPrice = input<string | null | undefined>(null);
  currencySymbol = input<string>('$');
  preferredUnit = input<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.Weight
  );

  /** Fail-closed: callers must opt in, so a missed call site cannot leak links. */
  linkFilaments = input(false);
  showPrices = input(false);

  /**
   * Ids of the visible legend entries that explain this row's `*`. Only the
   * meanings that actually apply are referenced, so one marker never announces
   * every legend entry. The ids are owned by the consuming page's legend.
   */
  protected markerDescribedBy(
    display: FilamentPreferredDisplayResult
  ): string | null {
    const ids: string[] = [];
    if (display.isEstimated) {
      ids.push('legend-estimated');
    }
    if (display.isFallback) {
      ids.push('legend-fallback');
    }
    return ids.length ? ids.join(' ') : null;
  }

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

  getPreferredDisplay(
    fu: PrintFilamentSummaryDto
  ): FilamentPreferredDisplayResult | null {
    return getFilamentPreferredDisplay(fu, this.preferredUnit());
  }
}
