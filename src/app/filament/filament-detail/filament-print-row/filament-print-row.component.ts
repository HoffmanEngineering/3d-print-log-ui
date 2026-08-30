import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { PrintImageComponent } from 'src/app/shared/print-image/print-image.component';
import {
  convertFilamentValue,
  getFilamentPreferredDisplay,
} from 'src/app/shared/utils/filament-display.utils';

/** One compact print row in the material detail rail. */
@Component({
  selector: 'app-filament-print-row',
  templateUrl: './filament-print-row.component.html',
  styleUrls: ['./filament-print-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatIconModule,
    MatTooltipModule,
    PrintImageComponent,
  ],
})
export class FilamentPrintRowComponent {
  readonly print = input.required<PrintSummary>();
  readonly filamentId = input.required<string>();
  readonly preferredUnit = input<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.Weight
  );

  /**
   * Every usage row for this spool. A print may carry more than one — there is no
   * unique index on (PrintId, FilamentId) — so taking only the first would show
   * half the usage and contradict the totals in the card above.
   */
  private readonly usages = computed<PrintFilamentSummaryDto[]>(() =>
    (this.print().filamentUsage ?? []).filter(
      (u) => u.filament?.id === this.filamentId()
    )
  );

  protected readonly hasImage = computed(
    () => (this.print().defaultPrintImageId ?? 0) > 0
  );

  protected readonly isEstimated = computed(() =>
    this.usages().some(
      (u) =>
        getFilamentPreferredDisplay(u, this.preferredUnit())?.isEstimated ??
        false
    )
  );

  /**
   * Summed across usage rows, resolving actual-else-estimated PER ROW and in each
   * row's OWN unit before adding anything together.
   *
   * Two things have to happen in that order. Resolving per row matters because the
   * display helper prefers actual over estimated across a whole row, so merging the
   * columns first would let one row's actual value hide another row's estimate.
   * Resolving each row's UNIT matters because rows on the same print need not share
   * one: a 12 g weight row beside a 10 m length row totals ~42 g, and formatting the
   * merged row with only the first row's source would report 12 g and silently drop
   * the length entirely.
   *
   * Rows already sharing a unit are summed in that unit, so the common case needs no
   * conversion and cannot fail. Mixed units are converted to milligrams, the same
   * common denominator the server's own `totalUsedMg` uses. If some row cannot be
   * converted, this returns null rather than a total that is quietly short.
   */
  protected readonly usageDisplay = computed(() => {
    const usages = this.usages();
    if (usages.length === 0) {
      return null;
    }
    if (usages.length === 1) {
      return getFilamentPreferredDisplay(usages[0], this.preferredUnit());
    }

    const resolved = usages.map((usage) => resolveRow(usage));
    if (resolved.some((row) => row === null)) {
      return null;
    }
    const rows = resolved as ResolvedRow[];

    const firstUnit = rows[0].unit;
    const sharesOneUnit = rows.every((row) => row.unit === firstUnit);
    const filament = usages[0].filament;

    if (sharesOneUnit) {
      const total = rows.reduce((sum, row) => sum + row.value, 0);
      return getFilamentPreferredDisplay(
        mergedRow(usages[0], firstUnit, total),
        this.preferredUnit()
      );
    }

    let totalMg = 0;
    for (const row of rows) {
      const mg = convertFilamentValue(
        row.value,
        row.unit,
        PrintFilamentSourceMeasurement.Weight,
        filament
      );
      if (mg === null) {
        return null;
      }
      totalMg += mg;
    }

    return getFilamentPreferredDisplay(
      mergedRow(usages[0], PrintFilamentSourceMeasurement.Weight, totalMg),
      this.preferredUnit()
    );
  });
}

interface ResolvedRow {
  unit: PrintFilamentSourceMeasurement;
  value: number;
}

/**
 * One row's contribution: its actual value if it has one, otherwise its estimate,
 * each read in the unit that row was recorded in. Null when the row records nothing.
 */
function resolveRow(usage: PrintFilamentSummaryDto): ResolvedRow | null {
  const actual = valueInUnit(usage, usage.source, false);
  if (actual !== null) {
    return actual;
  }
  return valueInUnit(usage, usage.estimatedSource, true);
}

function valueInUnit(
  usage: PrintFilamentSummaryDto,
  unit: PrintFilamentSourceMeasurement | undefined,
  estimated: boolean
): ResolvedRow | null {
  const candidates: [
    PrintFilamentSourceMeasurement,
    number | null | undefined,
  ][] = estimated
    ? [
        [PrintFilamentSourceMeasurement.Weight, usage.estimatedAmountMg],
        [PrintFilamentSourceMeasurement.Length, usage.estimatedLengthInM],
        [PrintFilamentSourceMeasurement.Volume, usage.estimatedVolumeMl],
      ]
    : [
        [PrintFilamentSourceMeasurement.Weight, usage.amountMg],
        [PrintFilamentSourceMeasurement.Length, usage.lengthInM],
        [PrintFilamentSourceMeasurement.Volume, usage.volumeMl],
      ];

  // Prefer the row's declared source unit, but fall back to whichever column it
  // actually carries: `source` is optional on the DTO and may be AsRecorded.
  const ordered =
    unit == null
      ? candidates
      : [
          ...candidates.filter(([candidate]) => candidate === unit),
          ...candidates.filter(([candidate]) => candidate !== unit),
        ];

  for (const [candidateUnit, value] of ordered) {
    if ((value ?? 0) > 0) {
      return { unit: candidateUnit, value: value as number };
    }
  }
  return null;
}

/**
 * A synthetic row carrying the summed total in one unit. The estimated columns are
 * cleared so the display helper cannot double count; whether any contribution was an
 * estimate is reported separately by `isEstimated`.
 */
function mergedRow(
  template: PrintFilamentSummaryDto,
  unit: PrintFilamentSourceMeasurement,
  total: number
): PrintFilamentSummaryDto {
  return {
    ...template,
    source: unit,
    amountMg:
      unit === PrintFilamentSourceMeasurement.Weight ? total : undefined,
    lengthInM:
      unit === PrintFilamentSourceMeasurement.Length ? total : undefined,
    volumeMl:
      unit === PrintFilamentSourceMeasurement.Volume ? total : undefined,
    estimatedAmountMg: undefined,
    estimatedLengthInM: undefined,
    estimatedVolumeMl: undefined,
  };
}
