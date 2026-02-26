import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-filament-spool-icon',
  templateUrl: './filament-spool-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilamentSpoolIconComponent {
  private static readonly HEX_PATTERN = /^[0-9A-Fa-f]{3,8}$/;

  color = input<string>('');

  protected fillColor = computed(() => {
    const c = this.color();
    return c && FilamentSpoolIconComponent.HEX_PATTERN.test(c) ? `#${c}` : '#000000';
  });
}
