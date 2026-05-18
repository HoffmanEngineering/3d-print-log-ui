import { FilamentColorSwatchStylePipe } from './filament-color-swatch-style.pipe';
import { ColorPatternType } from '../../core/services/filament.service';

describe('FilamentColorSwatchStylePipe', () => {
  let pipe: FilamentColorSwatchStylePipe;

  beforeEach(() => {
    pipe = new FilamentColorSwatchStylePipe();
  });

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
});
