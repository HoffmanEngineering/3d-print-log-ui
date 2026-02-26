import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-filament-spool-icon',
  templateUrl: './filament-spool-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilamentSpoolIconComponent {
  color = input<string>('');

  protected fillColor = computed(() => `#${this.color()}`);
}
