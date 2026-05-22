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
const DONUT =
  'M 8 40 A 32 32 0 1 1 72 40 A 32 32 0 1 1 8 40 Z M 28 40 A 12 12 0 1 1 52 40 A 12 12 0 1 1 28 40 Z';

@Component({
  selector: 'app-filament-spool-icon',
  templateUrl: './filament-spool-icon.component.html',
  styleUrls: ['./filament-spool-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilamentSpoolIconComponent {
  // Existing input — kept for backward compat; used as fallback for Solid when colors[] is empty
  color = input<string>('');

  // New inputs
  colorPattern = input<ColorPatternType>(ColorPatternType.Solid);
  colors = input<string[]>([]);
  finishType = input<FilamentFinishType>(FilamentFinishType.Standard);
  effects = input<FilamentEffect[]>([]);

  // Unique ID prefix — prevents SVG def ID collisions when multiple icons are on the same page
  protected readonly uid = `spool-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly DONUT = DONUT;
  protected readonly ColorPatternType = ColorPatternType;
  protected readonly FilamentEffect = FilamentEffect;
  protected readonly FilamentFinishType = FilamentFinishType;

  // Resolved colors array — falls back to [color] for legacy callers
  protected effectiveColors = computed((): string[] => {
    const c = this.colors();
    if (c.length > 0) return c;
    const legacy = this.color();
    return HEX.test(legacy) ? [legacy] : ['000000'];
  });

  // Single fill color — used only for Solid pattern
  protected fillColor = computed((): string => `#${this.effectiveColors()[0]}`);

  // Clip segments for Multi pattern
  protected clipSegments = computed(() => {
    if (this.colorPattern() !== ColorPatternType.Multi) return [];
    return this.effectiveColors().map((color, i, arr) => ({
      id: `${this.uid}-clip-${i}`,
      color: `#${color}`,
      x: ((80 * i) / arr.length).toString(),
      width: (80 / arr.length).toString(),
    }));
  });

  // Gradient stops for Gradient and Rainbow patterns
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
