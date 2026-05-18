import { FilamentColorSwatchStylePipe } from './filament-color-swatch-style.pipe';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
} from '../../core/services/filament.service';

describe('FilamentColorSwatchStylePipe', () => {
  let pipe: FilamentColorSwatchStylePipe;

  beforeEach(() => {
    pipe = new FilamentColorSwatchStylePipe();
  });

  // --- Existing tests (must continue to pass) ---

  it('returns solid background for Solid pattern', () => {
    const result = pipe.transform(['ff0000'], ColorPatternType.Solid);
    expect(result).toBe('background: #ff0000');
  });

  it('returns two-stop hard gradient for Multi pattern with 2 colors', () => {
    const result = pipe.transform(['ff0000', '0000ff'], ColorPatternType.Multi);
    expect(result).toBe(
      'background: linear-gradient(90deg, #ff0000 0%, #ff0000 50%, #0000ff 50%, #0000ff 100%)'
    );
  });

  it('returns smooth gradient for Gradient pattern', () => {
    const result = pipe.transform(
      ['ff0000', '0000ff'],
      ColorPatternType.Gradient
    );
    expect(result).toBe('background: linear-gradient(90deg, #ff0000, #0000ff)');
  });

  it('returns multi-stop smooth gradient for Rainbow pattern', () => {
    const result = pipe.transform(
      ['ff0000', 'ffe040', '0000ff'],
      ColorPatternType.Rainbow
    );
    expect(result).toBe(
      'background: linear-gradient(90deg, #ff0000, #ffe040, #0000ff)'
    );
  });

  it('falls back to solid for empty colors array', () => {
    const result = pipe.transform([], ColorPatternType.Solid);
    expect(result).toBe('background: #000000');
  });

  // --- New tests for finishType and effects ---

  it('adds shimmer overlay for Silk finish on solid color', () => {
    const result = pipe.transform(
      ['ff0000'],
      ColorPatternType.Solid,
      FilamentFinishType.Silk
    );
    expect(result).toContain(
      'background-image: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)'
    );
    expect(result).toContain('background-color: #ff0000');
    expect(result).toContain('background-size: 200% 100%');
    expect(result).not.toContain('background:');
  });

  it('adds shimmer overlay for Silk finish on gradient color', () => {
    const result = pipe.transform(
      ['ff0000', '0000ff'],
      ColorPatternType.Gradient,
      FilamentFinishType.Silk
    );
    expect(result).toContain(
      'background-image: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%), linear-gradient(90deg, #ff0000, #0000ff)'
    );
    expect(result).toContain('background-size: 200% 100%, 100% 100%');
  });

  it('adds desaturation filter for Matte finish', () => {
    const result = pipe.transform(
      ['ff0000'],
      ColorPatternType.Solid,
      FilamentFinishType.Matte
    );
    expect(result).toContain('background: #ff0000');
    expect(result).toContain('filter: saturate(0.6) brightness(0.95)');
  });

  it('adds opacity for Translucent effect', () => {
    const result = pipe.transform(
      ['ff0000'],
      ColorPatternType.Solid,
      FilamentFinishType.Standard,
      [FilamentEffect.Translucent]
    );
    expect(result).toContain('background: #ff0000');
    expect(result).toContain('opacity: 0.7');
  });

  it('adds glow box-shadow for GlowInDark effect', () => {
    const result = pipe.transform(
      ['ff0000'],
      ColorPatternType.Solid,
      FilamentFinishType.Standard,
      [FilamentEffect.GlowInDark]
    );
    expect(result).toContain('background: #ff0000');
    expect(result).toContain(
      'box-shadow: inset 0 0 6px rgba(120,255,120,0.5), 0 0 8px rgba(120,255,120,0.4)'
    );
  });

  it('combines multi-color gradient with Silk shimmer', () => {
    const result = pipe.transform(
      ['ff0000', '0000ff'],
      ColorPatternType.Multi,
      FilamentFinishType.Silk
    );
    expect(result).toContain('background-image:');
    expect(result).toContain('background-size: 200% 100%, 100% 100%');
  });

  it('ignores non-renderable effects (Sparkle, WoodFill, etc.)', () => {
    const result = pipe.transform(
      ['ff0000'],
      ColorPatternType.Solid,
      FilamentFinishType.Standard,
      [FilamentEffect.Sparkle, FilamentEffect.WoodFill]
    );
    expect(result).toBe('background: #ff0000');
  });
});
