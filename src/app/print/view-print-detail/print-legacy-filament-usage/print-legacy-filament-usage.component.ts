import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PrintDetail } from 'src/app/core/services/print.service';

/**
 * Whether a print carries pre-`filamentUsage` legacy weight fields.
 *
 * Exported as a function, not just a component computed, because the parent must
 * decide whether to render the component at all — and a template reference
 * variable declared inside an `@if` is not in scope in that block's condition.
 */
export function hasLegacyFilamentData(print: PrintDetail | null): boolean {
  return (
    (print?.filamentUsageMg ?? 0) > 0 ||
    (print?.estimatedFilamentUsageMg ?? 0) > 0 ||
    !!print?.filamentType?.trim()
  );
}

/**
 * Pre-`filamentUsage` fields. Always displayed in grams: these rows carry no
 * length or volume data, so the user's preferred display unit cannot apply.
 */
@Component({
  selector: 'app-print-legacy-filament-usage',
  templateUrl: './print-legacy-filament-usage.component.html',
  styleUrls: ['./print-legacy-filament-usage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintLegacyFilamentUsageComponent {
  print = input.required<PrintDetail>();

  readonly hasLegacyData = computed(() => hasLegacyFilamentData(this.print()));

  protected readonly actualGrams = computed(() => {
    const mg = this.print()?.filamentUsageMg ?? 0;
    return mg > 0 ? mg / 1000 : null;
  });

  protected readonly estimatedGrams = computed(() => {
    const mg = this.print()?.estimatedFilamentUsageMg ?? 0;
    return mg > 0 ? mg / 1000 : null;
  });
}
