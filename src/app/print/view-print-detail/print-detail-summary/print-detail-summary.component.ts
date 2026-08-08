import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintService,
} from 'src/app/core/services/print.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { FilamentUsageSummaryComponent } from 'src/app/shared/filament-usage-summary/filament-usage-summary.component';
import { PrintStatusBadgeComponent } from 'src/app/shared/print-status-badge/print-status-badge.component';
import {
  externalUrlLabel,
  safeExternalUrl,
} from 'src/app/shared/utils/external-url.utils';
import {
  PrintLegacyFilamentUsageComponent,
  hasLegacyFilamentData,
} from '../print-legacy-filament-usage/print-legacy-filament-usage.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-print-detail-summary',
  templateUrl: './print-detail-summary.component.html',
  styleUrls: ['./print-detail-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DurationPipe,
    LocaleDatePipe,
    FilamentUsageSummaryComponent,
    PrintStatusBadgeComponent,
    PrintLegacyFilamentUsageComponent,
  ],
})
export class PrintDetailSummaryComponent {
  private readonly printService = inject(PrintService);

  print = input.required<PrintDetail>();
  user = input<UserSummaryDto | null>(null);
  isOwner = input(false);
  currencySymbol = input('$');
  defaultFilamentPrice = input<string | null>(null);
  kwhRate = input<string | null>(null);
  defaultWattage = input<string | null>(null);
  preferredUnit = input<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.AsRecorded
  );

  closed = output<void>();

  protected readonly isUserProfileFeatureEnabled =
    environment.features.userProfile;

  protected readonly printer = computed(() => this.print()?.printer ?? null);

  protected readonly sourceUrl = computed(() =>
    safeExternalUrl(this.print()?.url)
  );
  protected readonly sourceLabel = computed(() => {
    const raw = this.print()?.url?.trim();
    return raw ? externalUrlLabel(raw) : null;
  });

  protected readonly hasFilamentUsage = computed(
    () => (this.print()?.filamentUsage?.length ?? 0) > 0
  );

  // Computed here rather than read off a #ref on the child: a template
  // reference declared inside an @if is not in scope in that @if's condition.
  protected readonly hasLegacyFilament = computed(() =>
    hasLegacyFilamentData(this.print())
  );

  /**
   * Owner-only: derived from the owner's own purchase prices.
   * calculateTotalPrintCost returns { prices, total } — unwrap to the total.
   */
  private readonly materialCostResult = computed(() => {
    if (!this.isOwner() || !this.hasFilamentUsage()) {
      return null;
    }
    return this.printService.calculateTotalPrintCost(
      this.print().filamentUsage,
      this.currencySymbol(),
      this.defaultFilamentPrice() ?? undefined
    );
  });

  protected readonly materialCost = computed(
    () => this.materialCostResult()?.total ?? null
  );

  /**
   * calculateTotalPrintCost returns valid:true whenever ANY row priced
   * successfully, so a print where two of three materials have no price still
   * reports a confident-looking total. Flag that rather than presenting a
   * partial sum as complete.
   */
  protected readonly materialCostIsPartial = computed(() => {
    const result = this.materialCostResult();
    if (!result?.total?.valid) {
      return false;
    }
    const pricedRows = result.prices.filter((p) => p.valid).length;
    const rowsNeedingPrice = this.print().filamentUsage.filter(
      (fu) => fu.filament !== null
    ).length;
    return pricedRows < rowsNeedingPrice;
  });

  /** Owner-only: derived from the owner's own kWh rate. */
  protected readonly electricityCost = computed(() => {
    if (!this.isOwner()) {
      return null;
    }
    const p = this.print();
    return this.printService.calculateElectricityCost({
      printTimeSeconds: p.printTimeInSeconds ?? p.estimatedPrintTimeInSeconds,
      kwhRate: this.kwhRate(),
      printerWattageW: p.printer?.wattageW,
      defaultWattageW: this.defaultWattage(),
      currencySymbol: this.currencySymbol(),
    });
  });

  protected onClose(): void {
    this.closed.emit();
  }
}
