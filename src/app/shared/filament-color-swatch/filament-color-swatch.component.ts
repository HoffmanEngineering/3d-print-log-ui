import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { FilamentColorSwatchStylePipe } from 'src/app/shared/pipes/filament-color-swatch-style.pipe';

@Component({
  selector: 'app-filament-color-swatch',
  templateUrl: './filament-color-swatch.component.html',
  styleUrls: ['./filament-color-swatch.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilamentColorSwatchStylePipe],
})
export class FilamentColorSwatchComponent {
  filament = input.required<FilamentSummary>();

  /**
   * Set when an adjacent visible label already names the color. Prevents the
   * color being announced twice by a screen reader.
   */
  decorative = input(false);

  protected readonly accessibleName = computed(
    () => this.filament()?.colorName?.trim() || 'Filament color'
  );
}
