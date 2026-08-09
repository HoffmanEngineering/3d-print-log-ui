import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintService,
} from 'src/app/core/services/print.service';
import { ProjectService } from 'src/app/core/services/project.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { FilamentUsageSummaryComponent } from 'src/app/shared/filament-usage-summary/filament-usage-summary.component';
import { PrintStatusBadgeComponent } from 'src/app/shared/print-status-badge/print-status-badge.component';
import { getFilamentPreferredDisplay } from 'src/app/shared/utils/filament-display.utils';
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
  private readonly projectService = inject(ProjectService);

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

  /**
   * GET /api/Users/{id}/summary returns `displayName: null` for a user who has
   * not set one, which rendered an empty <a> — an axe "link-name" failure and
   * an unlabeled tab stop. Treat a blank name as no attributable user: the
   * byline falls back to the date-only form rather than linking nothing.
   */
  protected readonly namedUser = computed(() => {
    const user = this.user();
    return user?.displayName?.trim() ? user : null;
  });

  /**
   * `EMPTY_GUID` is the API's "no project" value, not a project to link to.
   */
  protected readonly projectId = computed(() => {
    const id = this.print()?.projectId?.trim();
    return id && id !== EMPTY_GUID ? id : null;
  });

  /**
   * GET /api/Prints/{id} returns `projectId` but no `projectName`, so the rail
   * knew a print belonged to a project and still had nothing to render. Fetch
   * the name when the print did not carry one.
   *
   * This is a public route, so the request must never propagate a failure: an
   * anonymous visitor, a private project, or a deleted one all collapse to
   * `null` and the row falls back to a generic label rather than breaking the
   * page. Remove this once the API includes the name on the print payload.
   */
  private readonly fetchedProjectName = toSignal(
    toObservable(
      computed(() =>
        this.print()?.projectName?.trim() ? null : this.projectId()
      )
    ).pipe(
      switchMap((id) =>
        id
          ? this.projectService.getProjectById(id).pipe(
              map((project) => project?.name?.trim() || null),
              catchError(() => of(null))
            )
          : of(null)
      )
    ),
    { initialValue: null }
  );

  protected readonly projectName = computed(
    () => this.print()?.projectName?.trim() || this.fetchedProjectName()
  );

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

  /**
   * Which legend entries to render. Rendering all four unconditionally put
   * four asterisk footnotes under every print, including ones where none of
   * them applied.
   *
   * The estimated/fallback flags are recomputed here from the same pure helper
   * the filament table uses, rather than reached for through a viewChild: the
   * legend belongs to this page, so the page decides what it says.
   */
  protected readonly legend = computed(() => {
    const rows = this.print()?.filamentUsage ?? [];
    const unit = this.preferredUnit();
    let estimated = false;
    let fallback = false;
    for (const fu of rows) {
      const display = getFilamentPreferredDisplay(fu, unit);
      estimated ||= display?.isEstimated === true;
      fallback ||= display?.isFallback === true;
    }

    const costResult = this.materialCostResult();
    const defaultPrice =
      (costResult?.total?.valid === true &&
        costResult.total.usesDefaultPrice === true) ||
      (costResult?.prices ?? []).some((p) => p.valid && p.usesDefaultPrice);

    const electricity = this.electricityCost();
    const defaultWattage =
      electricity?.valid === true && electricity.usesDefaultWattage === true;

    return {
      estimated,
      fallback,
      defaultPrice,
      defaultWattage,
      any: estimated || fallback || defaultPrice || defaultWattage,
    };
  });

  protected onClose(): void {
    this.closed.emit();
  }
}
