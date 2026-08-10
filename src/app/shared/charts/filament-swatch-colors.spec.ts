import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from 'src/app/core/services/filament.service';
import {
  buildSwatchDescriptor,
  normalizeHex,
  swatchCssStyle,
} from './filament-swatch-colors';

describe('normalizeHex', () => {
  it('accepts three- and six-digit hex with or without a hash', () => {
    expect(normalizeHex('ff0000')).toBe('#ff0000');
    expect(normalizeHex('#FF0000')).toBe('#FF0000');
    expect(normalizeHex('f00')).toBe('#f00');
  });

  it('rejects anything that is not a hex color', () => {
    // These are the values that must never reach an SVG attribute.
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('url(#x)')).toBeNull();
    expect(normalizeHex('#ff0000;fill:url(#evil)')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });
});

describe('buildSwatchDescriptor', () => {
  it('describes a solid color as one stop with no offset', () => {
    const descriptor = buildSwatchDescriptor(
      ['ff0000'],
      ColorPatternType.Solid
    );

    expect(descriptor.kind).toBe('solid');
    expect(descriptor.stops).toEqual([
      { color: '#ff0000', offsetPercent: null },
    ]);
  });

  it('describes Gradient and Rainbow as stops without offsets', () => {
    const descriptor = buildSwatchDescriptor(
      ['ff0000', '0000ff'],
      ColorPatternType.Gradient
    );

    expect(descriptor.kind).toBe('gradient');
    expect(descriptor.stops.map((s) => s.offsetPercent)).toEqual([null, null]);
  });

  it('describes Multi as doubled hard stops with offsets', () => {
    const descriptor = buildSwatchDescriptor(
      ['ff0000', '0000ff'],
      ColorPatternType.Multi
    );

    expect(descriptor.stops).toEqual([
      { color: '#ff0000', offsetPercent: 0 },
      { color: '#ff0000', offsetPercent: 50 },
      { color: '#0000ff', offsetPercent: 50 },
      { color: '#0000ff', offsetPercent: 100 },
    ]);
  });

  it('falls back to black for an empty color list, as the pipe always has', () => {
    const descriptor = buildSwatchDescriptor([], ColorPatternType.Solid);

    expect(descriptor.stops).toEqual([
      { color: '#000000', offsetPercent: null },
    ]);
  });

  it('falls back to black for a color token that is not valid hex', () => {
    const descriptor = buildSwatchDescriptor(
      ['url(#evil)'],
      ColorPatternType.Solid
    );

    expect(descriptor.stops).toEqual([
      { color: '#000000', offsetPercent: null },
    ]);
  });

  it('falls back to solid for an unknown pattern value', () => {
    const descriptor = buildSwatchDescriptor(
      ['ff0000', '0000ff'],
      99 as ColorPatternType
    );

    expect(descriptor.kind).toBe('solid');
  });

  it('records finish and effects as flags rather than CSS', () => {
    const descriptor = buildSwatchDescriptor(
      ['ff0000'],
      ColorPatternType.Solid,
      FilamentFinishType.Silk,
      [FilamentEffect.Translucent, FilamentEffect.GlowInDark]
    );

    expect(descriptor.shimmer).toBeTrue();
    expect(descriptor.desaturate).toBeFalse();
    expect(descriptor.opacity).toBe(0.7);
    expect(descriptor.glow).toBeTrue();
  });
});

describe('swatchCssStyle', () => {
  it('reproduces the exact Multi gradient string the pipe has always emitted', () => {
    const style = swatchCssStyle(
      buildSwatchDescriptor(['ff0000', '0000ff'], ColorPatternType.Multi)
    );

    expect(style).toBe(
      'background: linear-gradient(90deg, #ff0000 0%, #ff0000 50%, #0000ff 50%, #0000ff 100%)'
    );
  });
});
