import { Pipe, PipeTransform } from '@angular/core';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

@Pipe({ name: 'filamentColorSwatchStyle', pure: true, standalone: false })
export class FilamentColorSwatchStylePipe implements PipeTransform {
  transform(
    colors: string[],
    pattern: ColorPatternType,
    finishType?: FilamentFinishType,
    effects?: FilamentEffect[]
  ): string {
    const colorPart = this.buildColorPart(colors, pattern);
    const parts: string[] = [];

    const shimmer =
      'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)';

    if (finishType === FilamentFinishType.Silk) {
      if (colorPart.type === 'gradient') {
        parts.push(`background-image: ${shimmer}, ${colorPart.value}`);
        parts.push('background-size: 200% 100%, 100% 100%');
      } else {
        parts.push(`background-image: ${shimmer}`);
        parts.push(`background-color: ${colorPart.value}`);
        parts.push('background-size: 200% 100%');
      }
    } else {
      parts.push(`background: ${colorPart.value}`);
    }

    if (finishType === FilamentFinishType.Matte) {
      parts.push('filter: saturate(0.6) brightness(0.95)');
    }

    if (effects?.includes(FilamentEffect.Translucent)) {
      parts.push('opacity: 0.7');
    }

    if (effects?.includes(FilamentEffect.GlowInDark)) {
      parts.push(
        'box-shadow: inset 0 0 6px rgba(120,255,120,0.5), 0 0 8px rgba(120,255,120,0.4)'
      );
    }

    return parts.join('; ');
  }

  private buildColorPart(
    colors: string[],
    pattern: ColorPatternType
  ): { type: 'solid' | 'gradient'; value: string } {
    if (!colors?.length) return { type: 'solid', value: '#000000' };

    const hex = (c: string) => (c.startsWith('#') ? c : `#${c}`);

    switch (pattern) {
      case ColorPatternType.Gradient:
      case ColorPatternType.Rainbow:
        return {
          type: 'gradient',
          value: `linear-gradient(90deg, ${colors.map(hex).join(', ')})`,
        };

      case ColorPatternType.Multi: {
        const n = colors.length;
        const stops: string[] = [];
        colors.forEach((c, i) => {
          const startPct = Math.round((i / n) * 100);
          const endPct = Math.round(((i + 1) / n) * 100);
          stops.push(`${hex(c)} ${startPct}%`);
          stops.push(`${hex(c)} ${endPct}%`);
        });
        return {
          type: 'gradient',
          value: `linear-gradient(90deg, ${stops.join(', ')})`,
        };
      }

      case ColorPatternType.Solid:
      default:
        return { type: 'solid', value: hex(colors[0]) };
    }
  }
}
