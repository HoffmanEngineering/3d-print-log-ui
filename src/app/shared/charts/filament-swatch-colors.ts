import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from 'src/app/core/services/filament.service';

export interface SwatchStop {
  color: string;
  /** Null for a smooth gradient stop; a percentage for a hard Multi stop. */
  offsetPercent: number | null;
}

/**
 * A filament's appearance, described once and rendered two ways: as a CSS style string by
 * FilamentColorSwatchStylePipe, and as SVG <linearGradient>/<filter> defs by
 * filament-svg-defs. A CSS style string cannot be assigned to an SVG `fill`, which is why the
 * descriptor exists rather than the pipe being reused directly.
 */
export interface SwatchDescriptor {
  kind: 'solid' | 'gradient';
  stops: SwatchStop[];
  /** Silk. */
  shimmer: boolean;
  /** Matte. */
  desaturate: boolean;
  /** 0.7 for Translucent, otherwise 1. */
  opacity: number;
  /** Glow in the dark. */
  glow: boolean;
}

const FALLBACK = '#000000';
const HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Returns the token with a leading hash, or null if it is not a hex color.
 *
 * Colors are user-controlled persisted data and end up inside SVG attributes, so they are
 * validated against a strict pattern before use — "#ff0000;fill:url(#evil)" must never reach a
 * fill. Case is preserved because the pipe's pinned specs compare exact strings.
 */
export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!HEX.test(trimmed)) return null;
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function buildSwatchDescriptor(
  colors: string[],
  pattern: ColorPatternType,
  finishType?: FilamentFinishType,
  effects?: FilamentEffect[]
): SwatchDescriptor {
  const safe = (colors ?? []).map((c) => normalizeHex(c) ?? FALLBACK);

  const flags = {
    shimmer: finishType === FilamentFinishType.Silk,
    desaturate: finishType === FilamentFinishType.Matte,
    opacity: effects?.includes(FilamentEffect.Translucent) ? 0.7 : 1,
    glow: effects?.includes(FilamentEffect.GlowInDark) ?? false,
  };

  if (safe.length === 0) {
    return {
      kind: 'solid',
      stops: [{ color: FALLBACK, offsetPercent: null }],
      ...flags,
    };
  }

  switch (pattern) {
    case ColorPatternType.Gradient:
    case ColorPatternType.Rainbow:
      return {
        kind: 'gradient',
        stops: safe.map((color) => ({ color, offsetPercent: null })),
        ...flags,
      };

    case ColorPatternType.Multi: {
      const stops: SwatchStop[] = [];
      safe.forEach((color, index) => {
        stops.push({
          color,
          offsetPercent: Math.round((index / safe.length) * 100),
        });
        stops.push({
          color,
          offsetPercent: Math.round(((index + 1) / safe.length) * 100),
        });
      });
      return { kind: 'gradient', stops, ...flags };
    }

    case ColorPatternType.Solid:
    default:
      // An unknown enum value falls back to solid rather than rendering something arbitrary.
      return {
        kind: 'solid',
        stops: [{ color: safe[0], offsetPercent: null }],
        ...flags,
      };
  }
}

const SHIMMER =
  'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)';

/**
 * The CSS form. Output is pinned byte-for-byte by filament-color-swatch-style.pipe.spec.ts —
 * this function exists so the pipe and the SVG defs cannot drift, not to change any string.
 */
export function swatchCssStyle(descriptor: SwatchDescriptor): string {
  const value =
    descriptor.kind === 'gradient'
      ? `linear-gradient(90deg, ${descriptor.stops
          .map((s) =>
            s.offsetPercent === null
              ? s.color
              : `${s.color} ${s.offsetPercent}%`
          )
          .join(', ')})`
      : descriptor.stops[0].color;

  const parts: string[] = [];

  if (descriptor.shimmer) {
    if (descriptor.kind === 'gradient') {
      parts.push(`background-image: ${SHIMMER}, ${value}`);
      parts.push('background-size: 200% 100%, 100% 100%');
    } else {
      parts.push(`background-image: ${SHIMMER}`);
      parts.push(`background-color: ${value}`);
      parts.push('background-size: 200% 100%');
    }
  } else {
    parts.push(`background: ${value}`);
  }

  if (descriptor.desaturate)
    parts.push('filter: saturate(0.6) brightness(0.95)');
  if (descriptor.opacity !== 1) parts.push(`opacity: ${descriptor.opacity}`);
  if (descriptor.glow) {
    parts.push(
      'box-shadow: inset 0 0 6px rgba(120,255,120,0.5), 0 0 8px rgba(120,255,120,0.4)'
    );
  }

  return parts.join('; ');
}
