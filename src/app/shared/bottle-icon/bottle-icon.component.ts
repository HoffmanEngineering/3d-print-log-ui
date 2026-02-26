import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

@Component({
  selector: 'app-bottle-icon',
  templateUrl: './bottle-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottleIconComponent {
  private static readonly HEX_PATTERN = /^[0-9A-Fa-f]{3,8}$/;

  color = input<string>('');

  protected fillColor = computed(() => {
    const c = this.color();
    return c && BottleIconComponent.HEX_PATTERN.test(c) ? `#${c}` : '#000000';
  });
}
