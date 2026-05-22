import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

const HEX = /^[0-9A-Fa-f]{3,8}$/;
const BOTTLE_BODY =
  'M 22 10 L 58 10 L 58 18 Q 64 22 64 28 L 64 66 Q 64 74 56 74 L 24 74 Q 16 74 16 66 L 16 28 Q 16 22 22 18 Z';

@Component({
  selector: 'app-bottle-icon',
  templateUrl: './bottle-icon.component.html',
  styleUrls: ['./bottle-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottleIconComponent {
  color = input<string>('');

  colorPattern = input<ColorPatternType>(ColorPatternType.Solid);
  colors = input<string[]>([]);
  finishType = input<FilamentFinishType>(FilamentFinishType.Standard);
  effects = input<FilamentEffect[]>([]);

  protected readonly uid = `bottle-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly BOTTLE_BODY = BOTTLE_BODY;
  protected readonly ColorPatternType = ColorPatternType;
  protected readonly FilamentEffect = FilamentEffect;
  protected readonly FilamentFinishType = FilamentFinishType;

  protected effectiveColors = computed((): string[] => {
    const c = this.colors();
    if (c.length > 0) return c;
    const legacy = this.color();
    return HEX.test(legacy) ? [legacy] : ['000000'];
  });

  protected fillColor = computed(() => `#${this.effectiveColors()[0]}`);

  // Bottle Multi: vertical strips (left-to-right)
  protected clipSegments = computed(() => {
    if (this.colorPattern() !== ColorPatternType.Multi) return [];
    return this.effectiveColors().map((color, i, arr) => ({
      id: `${this.uid}-clip-${i}`,
      color: `#${color}`,
      x: ((80 * i) / arr.length).toString(),
      width: (80 / arr.length).toString(),
    }));
  });

  // Gradient stops — vertical for bottle (y1=0% y2=100%)
  protected gradientStops = computed(() => {
    const p = this.colorPattern();
    if (p !== ColorPatternType.Gradient && p !== ColorPatternType.Rainbow)
      return [];
    const colors = this.effectiveColors();
    return colors.map((color, i) => ({
      offset:
        colors.length === 1 ? '0%' : `${(i / (colors.length - 1)) * 100}%`,
      color: `#${color}`,
    }));
  });

  protected useGradient = computed(
    () =>
      this.colorPattern() === ColorPatternType.Gradient ||
      this.colorPattern() === ColorPatternType.Rainbow
  );

  protected gradientId = computed(() => `${this.uid}-grad`);

  protected fillOpacity = computed(() =>
    this.effects().includes(FilamentEffect.Translucent) ? '0.45' : '1'
  );

  protected hasEffect(effect: FilamentEffect): boolean {
    return this.effects().includes(effect);
  }
}
