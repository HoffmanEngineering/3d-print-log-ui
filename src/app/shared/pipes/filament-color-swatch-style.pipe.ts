import { Pipe, PipeTransform } from '@angular/core';
import { ColorPatternType } from '../../core/services/filament.service';

@Pipe({ name: 'filamentColorSwatchStyle', pure: true, standalone: false })
export class FilamentColorSwatchStylePipe implements PipeTransform {
  transform(colors: string[], pattern: ColorPatternType): string {
    if (!colors?.length) return 'background: #000000';

    const hex = (c: string) => `#${c}`;

    switch (pattern) {
      case ColorPatternType.Gradient:
      case ColorPatternType.Rainbow:
        return `background: linear-gradient(90deg, ${colors.map(hex).join(', ')})`;

      case ColorPatternType.Multi: {
        const n = colors.length;
        const stops: string[] = [];
        colors.forEach((c, i) => {
          const startPct = Math.round((i / n) * 100);
          const endPct = Math.round(((i + 1) / n) * 100);
          stops.push(`${hex(c)} ${startPct}%`);
          stops.push(`${hex(c)} ${endPct}%`);
        });
        return `background: linear-gradient(90deg, ${stops.join(', ')})`;
      }

      case ColorPatternType.Solid:
      default:
        return `background: ${hex(colors[0])}`;
    }
  }
}
