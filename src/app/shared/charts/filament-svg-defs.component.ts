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
} from 'src/app/core/services/filament.service';
import {
  SwatchDescriptor,
  buildSwatchDescriptor,
} from './filament-swatch-colors';

export interface FilamentSwatchInput {
  /** Stable identity for the swatch — a filament id, a material type, a colour name. */
  id: string;
  colors: string[];
  colorPattern: ColorPatternType;
  finishType?: FilamentFinishType;
  effects?: FilamentEffect[];
}

export interface SwatchDef {
  id: string;
  gradientId: string | null;
  filterId: string | null;
  descriptor: SwatchDescriptor;
  /** Evenly spaced offsets for a smooth gradient; the descriptor's own for a hard one. */
  stops: { color: string; offset: string }[];
}

// SVG element ids are DOCUMENT-global. Two charts on one page using the same filament id would
// cross-contaminate each other's fills, so each component instance gets its own prefix.
let instanceCounter = 0;

/**
 * Emits <linearGradient> and <filter> definitions for filament swatches, and hands back the
 * `fill` values that reference them.
 *
 * Everything here is Angular template markup with bound attributes — never string
 * concatenation. Colours, patterns, effects and names are user-controlled persisted data;
 * building SVG by string interpolation is how that data becomes an injection vector. Colours
 * are hex-validated upstream by normalizeHex, and anything that failed is already #000000.
 */
@Component({
  // An ATTRIBUTE selector on a real <g>, not an element. A custom element inside <svg> is
  // parsed into the SVG namespace as an unknown element, and neither it nor its <defs>
  // children render — so an app-prefixed element selector would silently produce no gradients.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'g[appFilamentSvgDefs]',
  templateUrl: './filament-svg-defs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilamentSvgDefsComponent {
  readonly swatches = input<FilamentSwatchInput[]>([]);

  private readonly prefix = `fil-${instanceCounter++}`;

  readonly defs = computed<SwatchDef[]>(() =>
    this.swatches().map((swatch, index) => {
      const descriptor = buildSwatchDescriptor(
        swatch.colors,
        swatch.colorPattern,
        swatch.finishType,
        swatch.effects
      );

      const needsFilter = descriptor.desaturate || descriptor.glow;
      const count = descriptor.stops.length;

      return {
        id: swatch.id,
        gradientId:
          descriptor.kind === 'gradient' ? `${this.prefix}-g${index}` : null,
        filterId: needsFilter ? `${this.prefix}-f${index}` : null,
        descriptor,
        stops: descriptor.stops.map((stop, stopIndex) => ({
          color: stop.color,
          offset:
            stop.offsetPercent !== null
              ? `${stop.offsetPercent}%`
              : `${count <= 1 ? 0 : Math.round((stopIndex / (count - 1)) * 100)}%`,
        })),
      };
    })
  );

  private readonly byId = computed(
    () => new Map(this.defs().map((d) => [d.id, d]))
  );

  /** A url() reference for a gradient, a literal hex for a solid, or the neutral series token. */
  fillFor(id: string): string {
    const def = this.byId().get(id);
    if (!def) return 'var(--chart-series-6)';
    return def.gradientId
      ? `url(#${def.gradientId})`
      : def.descriptor.stops[0].color;
  }

  filterFor(id: string): string | null {
    const def = this.byId().get(id);
    return def?.filterId ? `url(#${def.filterId})` : null;
  }

  opacityFor(id: string): number {
    return this.byId().get(id)?.descriptor.opacity ?? 1;
  }
}
