import { Pipe, PipeTransform } from '@angular/core';
import {
  buildSwatchDescriptor,
  swatchCssStyle,
} from '../charts/filament-swatch-colors';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

/**
 * Thin adapter over the shared swatch descriptor. The logic lives in
 * shared/charts/filament-swatch-colors.ts so the CSS swatches and the SVG chart fills are
 * built from ONE description of a filament's appearance and cannot drift apart.
 */
@Pipe({ name: 'filamentColorSwatchStyle', pure: true })
export class FilamentColorSwatchStylePipe implements PipeTransform {
  transform(
    colors: string[],
    pattern: ColorPatternType,
    finishType?: FilamentFinishType,
    effects?: FilamentEffect[]
  ): string {
    return swatchCssStyle(
      buildSwatchDescriptor(colors, pattern, finishType, effects)
    );
  }
}
